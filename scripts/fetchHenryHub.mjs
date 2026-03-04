#!/usr/bin/env node
/**
 * Fetch Henry Hub natural gas prices from FRED (St. Louis Fed)
 * and write to src/data/henryHub.json
 *
 * Data series:
 *   MHHNGSP - Monthly average Henry Hub spot price ($/MMBtu)
 *   DHHNGSP - Daily Henry Hub spot price ($/MMBtu)
 *
 * Run: node scripts/fetchHenryHub.mjs
 * Can be automated via GitHub Actions on a schedule.
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'henryHub.json');

const FRED_CSV_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv';
const START_DATE = '2024-01-01';

async function fetchFREDCsv(series, startDate, endDate) {
  const url = `${FRED_CSV_BASE}?id=${series}&cosd=${startDate}&coed=${endDate}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`FRED fetch failed: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();

  // Parse CSV: skip header, filter empty values
  return text
    .trim()
    .split('\n')
    .slice(1) // skip header
    .map(line => {
      const [date, value] = line.split(',');
      return { date, value: value === '' || value === '.' ? null : parseFloat(value) };
    })
    .filter(d => d.value !== null);
}

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Fetching Henry Hub data from FRED (${START_DATE} to ${today})...`);

  // Fetch monthly and daily in parallel
  const [monthly, daily] = await Promise.all([
    fetchFREDCsv('MHHNGSP', START_DATE, today),
    fetchFREDCsv('DHHNGSP', START_DATE, today),
  ]);

  console.log(`  Monthly: ${monthly.length} observations`);
  console.log(`  Daily:   ${daily.length} observations`);

  // Compute averages for each bill period (for accurate Entergy estimates)
  // Bill periods from our PGA data
  const billPeriods = [
    { billMonth: '2025-01', start: '2024-12-13', end: '2025-01-16' },
    { billMonth: '2025-07-entergy', start: '2025-06-12', end: '2025-06-30' },
    { billMonth: '2025-07', start: '2025-06-30', end: '2025-07-16' },
    { billMonth: '2025-08', start: '2025-07-16', end: '2025-08-14' },
    { billMonth: '2025-09', start: '2025-08-14', end: '2025-09-15' },
    { billMonth: '2025-10', start: '2025-09-15', end: '2025-10-14' },
    { billMonth: '2025-11', start: '2025-10-14', end: '2025-11-12' },
    { billMonth: '2025-12', start: '2025-11-12', end: '2025-12-15' },
    { billMonth: '2026-01', start: '2025-12-15', end: '2026-01-16' },
    { billMonth: '2026-02', start: '2026-01-16', end: '2026-02-18' },
  ];

  const periodAverages = billPeriods.map(period => {
    const daysInPeriod = daily.filter(d => d.date >= period.start && d.date <= period.end);
    const avg = daysInPeriod.length > 0
      ? Math.round((daysInPeriod.reduce((s, d) => s + d.value, 0) / daysInPeriod.length) * 100) / 100
      : null;
    return {
      billMonth: period.billMonth,
      periodStart: period.start,
      periodEnd: period.end,
      avgHenryHub: avg,
      tradingDays: daysInPeriod.length,
    };
  });

  console.log('\nBill period HH averages:');
  for (const p of periodAverages) {
    console.log(`  ${p.billMonth}: $${p.avgHenryHub}/MMBtu (${p.tradingDays} trading days)`);
  }

  const output = {
    description: 'Henry Hub natural gas spot prices from FRED (St. Louis Fed). Updated automatically.',
    source: 'https://fred.stlouisfed.org/series/DHHNGSP',
    lastUpdated: today,
    units: '$/MMBtu',
    monthly: monthly.map(d => ({ date: d.date, price: d.value })),
    daily: daily.map(d => ({ date: d.date, price: d.value })),
    billPeriodAverages: periodAverages,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`\nWritten to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
