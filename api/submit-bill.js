import { getSupabase } from './_lib/supabase.js';
import { calculateBillTotal, NOLA_ZIP_CODES, KNOWN_PGA } from './_lib/rates.js';
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://nola-utility-watch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

/**
 * POST /api/submit-bill
 *
 * Validates extracted bill data against the known rate formula and stores
 * the anonymized record in Supabase.
 *
 * Validation pipeline:
 * 1. Field type and range checks
 * 2. ZIP code in NOLA allowlist
 * 3. Recalculate bill with rate formula (must match within 2%)
 * 4. Cross-reference PGA against known rates if available
 * 5. Duplicate check via IP hash
 */
export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      provider, bill_month, period_start, period_end,
      ccf, pga_rate, total_gas_charges, zip_code,
    } = req.body;

    // ── 1. Field type and range validation ──────────────────────────────
    const errors = [];

    if (!['delta', 'entergy'].includes(provider)) {
      errors.push('provider must be "delta" or "entergy"');
    }

    if (!/^\d{4}-\d{2}$/.test(bill_month)) {
      errors.push('bill_month must be YYYY-MM format');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(period_end)) {
      errors.push('period_start and period_end must be YYYY-MM-DD format');
    }

    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errors.push('Invalid date format');
    } else if (endDate <= startDate) {
      errors.push('period_end must be after period_start');
    } else {
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 45) {
        errors.push(`Billing period too long: ${daysDiff} days (max 45)`);
      }
    }

    const ccfNum = Math.round(Number(ccf));
    if (!Number.isFinite(ccfNum) || ccfNum < 1 || ccfNum > 1000) {
      errors.push('ccf must be between 1 and 1000');
    }

    const pgaNum = Number(pga_rate);
    if (!Number.isFinite(pgaNum) || pgaNum <= 0 || pgaNum >= 3.0) {
      errors.push('pga_rate must be between 0.01 and 3.00 $/CCF');
    }

    const totalNum = Number(total_gas_charges);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      errors.push('total_gas_charges must be a positive number');
    }

    // ── 2. ZIP code validation ──────────────────────────────────────────
    if (!/^\d{5}$/.test(zip_code)) {
      errors.push('zip_code must be a 5-digit string');
    } else if (!NOLA_ZIP_CODES.has(zip_code)) {
      errors.push(`zip_code ${zip_code} is not a recognized New Orleans ZIP code`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_failed',
        details: errors,
      });
    }

    // ── 3. Rate formula validation ──────────────────────────────────────
    // Bills may report gas charges only (before franchise fee / city tax)
    // or the fully-loaded total. Accept whichever is closer.
    const { gasCharges, fullTotal } = calculateBillTotal(ccfNum, pgaNum);
    const errorGas = Math.abs(gasCharges - totalNum) / totalNum * 100;
    const errorFull = Math.abs(fullTotal - totalNum) / totalNum * 100;
    const calculatedTotal = errorGas <= errorFull ? gasCharges : fullTotal;
    const errorPct = Math.min(errorGas, errorFull);

    if (errorPct > 2.0) {
      return res.status(422).json({
        success: false,
        error: 'formula_mismatch',
        details: {
          submitted_total: totalNum,
          calculated_total: calculatedTotal,
          error_pct: Math.round(errorPct * 100) / 100,
          message: `Calculated total ($${calculatedTotal}) differs from submitted total ($${totalNum}) by ${errorPct.toFixed(1)}%. Bills must match within 2%.`,
        },
      });
    }

    // ── 4. Cross-reference against known PGA rates ──────────────────────
    const knownKey = `${provider}-${bill_month}`;
    const knownPGA = KNOWN_PGA[knownKey];
    if (knownPGA !== undefined) {
      const pgaDiff = Math.abs(pgaNum - knownPGA);
      if (pgaDiff > 0.01) {
        return res.status(422).json({
          success: false,
          error: 'pga_mismatch',
          details: {
            submitted_pga: pgaNum,
            known_pga: knownPGA,
            difference: Math.round(pgaDiff * 100000) / 100000,
            message: `Submitted PGA rate ($${pgaNum}) differs from known rate ($${knownPGA}) by $${pgaDiff.toFixed(5)}/CCF. Expected within $0.01.`,
          },
        });
      }
    }

    // ── 5. IP hashing for dedup and rate limiting ───────────────────────
    const ipHash = crypto
      .createHash('sha256')
      .update(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .digest('hex');

    // ── 6. Insert into Supabase ─────────────────────────────────────────
    const supabase = getSupabase();

    const { data, error: insertError } = await supabase
      .from('community_bills')
      .insert({
        provider,
        bill_month,
        period_start,
        period_end,
        ccf: ccfNum,
        pga_rate: pgaNum,
        total_gas: totalNum,
        calculated_total: calculatedTotal,
        validation_error_pct: Math.round(errorPct * 100) / 100,
        zip_code,
        submission_ip_hash: ipHash,
      })
      .select('id')
      .single();

    if (insertError) {
      // Check for duplicate
      if (insertError.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'duplicate',
          message: 'This bill appears to have already been submitted.',
        });
      }
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'storage_failed',
        message: 'Failed to save bill data. Please try again.',
      });
    }

    // Get current submission count for the success message
    const { count } = await supabase
      .from('community_bills')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      data: {
        bill_id: data.id,
        calculated_total: calculatedTotal,
        validation_error_pct: Math.round(errorPct * 100) / 100,
        total_submissions: count || 1,
      },
    });
  } catch (err) {
    console.error('submit-bill error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
