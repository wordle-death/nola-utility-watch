/**
 * Economic impact computation for S&WB water disruption incidents.
 *
 * Three-category wage/productivity model + operational costs:
 *   1. Business closure wages — workers at closed businesses lose shifts
 *   2. Childcare-forced absence — parents with no backup care miss work
 *   3. Productivity loss — all workers lose time to boil water logistics
 *
 * Two tiers:
 *   Conservative — defensible floor estimates
 *   Full         — broader ripple effects
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
    avgHourlyWage,
    bottledWaterCostPerPersonPerDay,
    restaurantsPerZone,
  } = assumptions;

  const isConservative = tier === 'conservative';

  // Category 1: Business closure wages
  // Workers at restaurants and small businesses that cannot operate under a boil water advisory
  const workersPerRestaurant = isConservative
    ? (assumptions.workersPerRestaurant || 5)
    : (assumptions.workersPerRestaurantFull || 8);
  let closureWorkers = restaurantsPerZone * workersPerRestaurant;
  if (!isConservative) {
    const otherSmallBizPerZone = 20;
    const workersPerSmallBiz = assumptions.workersPerSmallBiz || 4;
    closureWorkers += otherSmallBizPerZone * workersPerSmallBiz;
  }
  const businessClosureWages = closureWorkers * avgHourlyWage * hours;

  // Category 2: Childcare-forced absence
  // Workers who must stay home because schools/daycares close
  const absenceRate = isConservative
    ? (assumptions.childcareAbsenceRate || 0.25)
    : (assumptions.childcareAbsenceRateFull || 0.40);
  const childcareAbsence = pop * 0.12 * laborForceParticipation * absenceRate * avgHourlyWage * hours;

  // Category 3: Productivity loss (all workers — hourly, salaried, remote)
  // Time lost to boil water logistics: boiling water, buying supplies, disrupted routines
  const prodFactor = isConservative
    ? (assumptions.productivityFactor || 0.05)
    : (assumptions.productivityFactorFull || 0.12);
  const productivityLoss = pop * laborForceParticipation * avgHourlyWage * hours * prodFactor;

  // Bottled water / supplies
  const waterCostPerDay = isConservative ? bottledWaterCostPerPersonPerDay : 5.00;
  const bottledWater = pop * waterCostPerDay * days;

  // Business operational losses (non-labor: spoiled food, fixed costs, lost profit margin)
  const restaurantOpLoss = assumptions.restaurantOperationalLossPerDay || 300;
  let businessLoss = restaurantsPerZone * restaurantOpLoss * days;
  if (!isConservative) {
    const otherSmallBizPerZone = 20;
    const smallBizOpLoss = assumptions.otherSmallBizOperationalLossPerDay || 150;
    businessLoss += otherSmallBizPerZone * smallBizOpLoss * days;
  }

  // Childcare out-of-pocket costs (full tier only)
  // For families who DO find emergency care but must pay for it
  const childcareOutOfPocket = isConservative ? 0 : pop * 0.12 * 75 * days;

  // Main break infrastructure impacts (road closures, property damage)
  let footTrafficLoss = 0;
  let propertyDamage = 0;
  if (incident.type === 'main_break') {
    const bizAffected = assumptions.mainBreakAffectedBusinesses || 8;
    const footTrafficRate = isConservative
      ? (assumptions.mainBreakFootTrafficLossPerDay || 500)
      : (assumptions.mainBreakFootTrafficLossPerDayFull || 800);
    footTrafficLoss = bizAffected * footTrafficRate * days;

    propertyDamage = isConservative
      ? (assumptions.mainBreakPropertyDamagePerIncident || 2500)
      : (assumptions.mainBreakPropertyDamagePerIncidentFull || 7500);
  }

  const total = businessClosureWages + childcareAbsence + productivityLoss
    + bottledWater + businessLoss + childcareOutOfPocket
    + footTrafficLoss + propertyDamage;

  return {
    businessClosureWages: round(businessClosureWages),
    childcareAbsence: round(childcareAbsence),
    productivityLoss: round(productivityLoss),
    bottledWater: round(bottledWater),
    businessLoss: round(businessLoss),
    childcareOutOfPocket: round(childcareOutOfPocket),
    footTrafficLoss: round(footTrafficLoss),
    propertyDamage: round(propertyDamage),
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
