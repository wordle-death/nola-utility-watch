/**
 * Economic impact computation for Entergy electricity outage events.
 *
 * Uses DOE/LBNL Interruption Cost Estimate (ICE) methodology:
 *   - Standard per-customer-hour costs based on customer type
 *   - Residential vs commercial/industrial breakdown
 *
 * All constants are sourced from the ICE Calculator and EIA Form 861.
 */

import { formatDollars, formatNumber } from './swbImpact';

export { formatDollars, formatNumber };

/**
 * Compute the economic impact of a single outage event.
 *
 * @param {object} event - An event from entergyOutages.json
 * @param {object} assumptions - The assumptions block from entergyOutages.json
 * @returns {object} Impact breakdown
 */
export function computeOutageImpact(event, assumptions) {
  const {
    iceCostResidentialPerCustomerHour,
    iceCostCommercialPerCustomerHour,
    residentialShareOfCustomers,
    commercialShareOfCustomers,
  } = assumptions;

  const customerHours = event.totalCustomerHours || 0;

  const residentialImpact = customerHours * residentialShareOfCustomers * iceCostResidentialPerCustomerHour;
  const commercialImpact = customerHours * commercialShareOfCustomers * iceCostCommercialPerCustomerHour;
  const totalImpact = residentialImpact + commercialImpact;

  return {
    residentialImpact: Math.round(residentialImpact),
    commercialImpact: Math.round(commercialImpact),
    totalImpact: Math.round(totalImpact),
    totalCustomerHours: customerHours,
  };
}

/**
 * Compute aggregate stats across all outage events.
 *
 * @param {object[]} events
 * @param {object} assumptions
 * @returns {object} Aggregate statistics
 */
export function computeAggregateOutageStats(events, assumptions) {
  let totalCustomerHours = 0;
  let totalImpact = 0;
  let totalDurationHours = 0;
  let peakCustomersAffected = 0;

  for (const event of events) {
    const impact = computeOutageImpact(event, assumptions);
    totalCustomerHours += event.totalCustomerHours || 0;
    totalImpact += impact.totalImpact;
    totalDurationHours += event.durationHours || 0;
    peakCustomersAffected = Math.max(peakCustomersAffected, event.peakCustomersAffected || 0);
  }

  return {
    eventCount: events.length,
    totalCustomerHours: Math.round(totalCustomerHours),
    totalImpact: Math.round(totalImpact),
    totalDurationHours: Math.round(totalDurationHours),
    peakCustomersAffected,
  };
}
