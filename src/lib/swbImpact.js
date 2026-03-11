/**
 * Economic impact computation for S&WB water disruption incidents.
 *
 * Two-tier model:
 *   Conservative — captures direct, easily defensible costs only
 *   Full         — includes broader ripple effects (childcare, extra supplies)
 *
 * All constants are sourced and documented in swbIncidents.json.assumptions.
 */

/**
 * Compute the economic impact of a single incident.
 *
 * @param {object} incident  - An entry from swbIncidents.json
 * @param {object} assumptions - The assumptions block from swbIncidents.json
 * @param {'conservative'|'full'} tier
 * @returns {object} Itemized impact breakdown + total
 */
export function computeIncidentImpact(incident, assumptions, tier = 'conservative') {
  const pop = incident.estimatedPopulationAffected || 0;
  const hours = getIncidentDurationHours(incident);
  const days = hours / 24;

  const {
    laborForceParticipation,
    hourlyWorkerShare,
    avgHourlyWage,
    bottledWaterCostPerPersonPerDay,
    restaurantsPerZone,
    restaurantLostRevenuePerDay,
  } = assumptions;

  const isConservative = tier === 'conservative';

  // Lost wages: population × labor force rate × hourly worker share × wage × hours × productivity factor
  const productivityFactor = isConservative ? 0.15 : 0.35;
  const lostWages = pop * laborForceParticipation * hourlyWorkerShare * avgHourlyWage * hours * productivityFactor;

  // Bottled water / supplies
  const waterCostPerDay = isConservative ? bottledWaterCostPerPersonPerDay : 5.00;
  const bottledWater = pop * waterCostPerDay * days;

  // Business losses (restaurants + small biz in full tier)
  let businessLoss = restaurantsPerZone * restaurantLostRevenuePerDay * days;
  if (!isConservative) {
    // Add other small businesses (laundromats, salons, cafes, etc.)
    const otherSmallBizPerZone = 20;
    const otherSmallBizLostPerDay = 400;
    businessLoss += otherSmallBizPerZone * otherSmallBizLostPerDay * days;
  }

  // Childcare disruption (full tier only)
  // ~12% of population lives in households with children under 6
  const childcare = isConservative ? 0 : pop * 0.12 * 75 * days;

  const total = lostWages + bottledWater + businessLoss + childcare;

  return {
    lostWages: round(lostWages),
    bottledWater: round(bottledWater),
    businessLoss: round(businessLoss),
    childcare: round(childcare),
    total: round(total),
    durationHours: hours,
    durationDays: round(days),
    tier,
  };
}

/**
 * Compute aggregate stats across all incidents.
 *
 * @param {object[]} incidents
 * @param {object} assumptions
 * @returns {object} Aggregate statistics
 */
export function computeAggregateStats(incidents, assumptions) {
  let totalHours = 0;
  let totalPersonDays = 0;
  let conservativeTotal = 0;
  let fullTotal = 0;
  let activeAdvisories = 0;

  for (const inc of incidents) {
    const hours = getIncidentDurationHours(inc);
    const days = hours / 24;
    const pop = inc.estimatedPopulationAffected || 0;

    totalHours += hours;
    totalPersonDays += pop * days;

    const conserv = computeIncidentImpact(inc, assumptions, 'conservative');
    const full = computeIncidentImpact(inc, assumptions, 'full');
    conservativeTotal += conserv.total;
    fullTotal += full.total;

    if (inc.boilWaterAdvisory && !inc.advisoryEndDate) {
      activeAdvisories++;
    }
  }

  return {
    totalHours: round(totalHours),
    totalPersonDays: Math.round(totalPersonDays),
    conservativeTotal: round(conservativeTotal),
    fullTotal: round(fullTotal),
    activeAdvisories,
    incidentCount: incidents.length,
  };
}

/**
 * Get duration in hours for an incident.
 * Uses durationHours if set, otherwise computes from date/endDate.
 * For ongoing incidents (no endDate), uses current time.
 */
export function getIncidentDurationHours(incident) {
  if (incident.durationHours != null) return incident.durationHours;

  const start = new Date(incident.date + 'T06:00:00');
  const end = incident.endDate
    ? new Date(incident.endDate + 'T18:00:00')
    : new Date(); // ongoing — use current time

  const ms = end - start;
  return Math.max(0, ms / (1000 * 60 * 60));
}

/**
 * Format a dollar amount for display.
 * Under $10k: "$1,234"
 * $10k–$999k: "$123K"
 * $1M+: "$1.2M"
 */
export function formatDollars(amount) {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 10_000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${Math.round(amount).toLocaleString()}`;
}

/**
 * Format a number with commas.
 */
export function formatNumber(n) {
  return Math.round(n).toLocaleString();
}

function round(n) {
  return Math.round(n * 100) / 100;
}
