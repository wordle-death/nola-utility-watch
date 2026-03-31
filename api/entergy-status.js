const ORLEANS_PARISH_ZIPS = new Set([
  '70112', '70113', '70114', '70115', '70116', '70117', '70118', '70119',
  '70122', '70124', '70125', '70126', '70127', '70128', '70129', '70130',
  '70131', '70139', '70141', '70142', '70143', '70148',
]);

const DATACAPABLE_URL =
  'https://entergy.datacapable.com/datacapable/v1/entergy/EntergyLouisiana/zip';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  try {
    const response = await fetch(DATACAPABLE_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch Entergy data' });
    }

    const data = await response.json();
    const records = Array.isArray(data) ? data : data?.data || [];

    let customersAffected = 0;
    let customersServed = 0;
    const affectedZips = [];

    for (const rec of records) {
      const zip = String(rec.zip || rec.zipCode || rec.zipcode || '');
      if (!ORLEANS_PARISH_ZIPS.has(zip)) continue;

      const affected = parseInt(rec.customersAffected || rec.customers_affected || 0, 10);
      const served = parseInt(rec.customersServed || rec.customers_served || 0, 10);

      customersAffected += affected;
      customersServed += served;
      if (affected > 0) {
        affectedZips.push({ zip, customersAffected: affected });
      }
    }

    const percentageWithPower =
      customersServed > 0
        ? ((customersServed - customersAffected) / customersServed) * 100
        : 100;

    return res.status(200).json({
      customersAffected,
      customersServed,
      percentageWithPower: Math.round(percentageWithPower * 100) / 100,
      affectedZips,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error fetching outage data' });
  }
}
