import { getSupabase } from './_lib/supabase.js';
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://nola-utility-watch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

const EXTRACTION_PROMPT = `You are extracting structured data from a New Orleans residential gas bill from Delta Utilities (or its predecessor Entergy New Orleans).

Extract ONLY the following fields. Return valid JSON with exactly these keys:

{
  "provider": "delta" or "entergy",
  "bill_month": "YYYY-MM format, the billing month shown on the bill",
  "period_start": "YYYY-MM-DD, the meter read start date",
  "period_end": "YYYY-MM-DD, the meter read end date",
  "ccf": integer, the gas usage in CCF (hundred cubic feet),
  "pga_rate": number, the Purchase Gas Adjustment rate in $/CCF,
  "total_gas_charges": number, the total gas charges in dollars,
  "confidence": "high", "medium", or "low"
}

Important context:
- Delta Utilities took over gas service from Entergy New Orleans in July 2025
- Bills before July 2025 are from Entergy New Orleans
- The PGA rate may appear as "Purchase Gas Adjustment" or "PGA" or "Purchased Gas Cost" or similar
- CCF may also be labeled as "therms" or "gas usage" — we need the CCF value
- The total should be the "Gas Charges" or "Total Gas Charges" amount shown on the bill. On Entergy bills this is the gas section subtotal (before franchise fee and city tax which appear under "Other Charges & Credits"). On Delta bills use the gas charges total.
- If any field cannot be confidently extracted, set confidence to "low"

DO NOT extract: customer name, address, account number, or any personally identifying information.
Return ONLY the JSON object, no other text.`;

/**
 * POST /api/extract-bill
 *
 * Receives a base64-encoded bill image, sends it to Claude Vision for
 * structured data extraction, and returns the extracted fields.
 *
 * The bill image exists only in memory and is never stored.
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
    const { image, mediaType } = req.body;

    if (!image || !mediaType) {
      return res.status(400).json({
        error: 'Missing required fields: image (base64), mediaType',
      });
    }

    // Validate media type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mediaType)) {
      return res.status(400).json({
        error: `Unsupported media type: ${mediaType}. Allowed: ${allowedTypes.join(', ')}`,
      });
    }

    // Rate limiting
    const ipHash = crypto
      .createHash('sha256')
      .update(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .digest('hex');

    try {
      const supabase = getSupabase();
      const { data: rateData } = await supabase
        .from('rate_limits')
        .upsert(
          {
            ip_hash: ipHash,
            endpoint: 'extract-bill',
            window_start: new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString(),
            request_count: 1,
          },
          {
            onConflict: 'ip_hash,endpoint,window_start',
            ignoreDuplicates: false,
          }
        )
        .select('request_count');

      // Also increment if row existed
      if (rateData?.[0]?.request_count > 1) {
        // Row existed, upsert doesn't increment. Use RPC or manual update.
      }

      // Simpler approach: just query current count
      const hourStart = new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();
      const { data: limitCheck } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('ip_hash', ipHash)
        .eq('endpoint', 'extract-bill')
        .eq('window_start', hourStart)
        .single();

      if (limitCheck && limitCheck.request_count > 20) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again in an hour.',
        });
      }

      // Increment the counter
      if (limitCheck) {
        await supabase
          .from('rate_limits')
          .update({ request_count: limitCheck.request_count + 1 })
          .eq('ip_hash', ipHash)
          .eq('endpoint', 'extract-bill')
          .eq('window_start', hourStart);
      } else {
        await supabase.from('rate_limits').insert({
          ip_hash: ipHash,
          endpoint: 'extract-bill',
          window_start: hourStart,
          request_count: 1,
        });
      }
    } catch (rateLimitErr) {
      // If rate limiting fails (e.g., table doesn't exist yet), continue anyway
      console.warn('Rate limiting check failed:', rateLimitErr.message);
    }

    // Call Claude Vision API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: mediaType === 'application/pdf' ? 'document' : 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Claude API error:', response.status, errBody);
      return res.status(502).json({
        error: 'Failed to analyze bill image. Please try again.',
      });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;

    if (!content) {
      return res.status(502).json({
        error: 'No response from bill analysis. Please try again.',
      });
    }

    // Parse the JSON response from Claude
    let extracted;
    try {
      // Handle potential markdown code fences
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', content);
      return res.status(502).json({
        error: 'Could not parse bill data. Please try a clearer photo.',
      });
    }

    // Validate the extracted structure
    const requiredFields = ['provider', 'bill_month', 'period_start', 'period_end', 'ccf', 'pga_rate', 'total_gas_charges'];
    const missing = requiredFields.filter(f => extracted[f] === undefined || extracted[f] === null);
    if (missing.length > 0) {
      return res.status(422).json({
        error: `Could not extract all required fields from the bill: ${missing.join(', ')}`,
        extracted,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        provider: extracted.provider,
        bill_month: extracted.bill_month,
        period_start: extracted.period_start,
        period_end: extracted.period_end,
        ccf: Math.round(Number(extracted.ccf)),
        pga_rate: Number(extracted.pga_rate),
        total_gas_charges: Number(extracted.total_gas_charges),
        confidence: extracted.confidence || 'medium',
      },
    });
  } catch (err) {
    console.error('extract-bill error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
