import { useState } from 'react';
import outageData from '../data/entergyOutages.json';

export default function ElectricityMethodology() {
  const [showFormulas, setShowFormulas] = useState(false);
  const a = outageData.assumptions;
  const t = outageData.thresholds;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Analysis</h2>
      <div className="prose prose-sm text-gray-600 space-y-4">

        <p>
          This tracker monitors electricity outages affecting Orleans Parish using
          automated data collection from Entergy{"'"}s public outage reporting system.
          Economic impact is estimated using the DOE/LBNL Interruption Cost Estimate (ICE)
          methodology — the federal standard for valuing power interruption costs.
        </p>

        {/* Data source */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">How we collect outage data</h3>
          <p>
            Entergy publishes real-time outage counts through their DataCapable platform.
            The open-source project{' '}
            <a href="https://github.com/patricktrainer/entergy-outages" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              patricktrainer/entergy-outages
            </a>{' '}
            (Apache 2.0 license) captures snapshots of this data every 15 minutes and stores
            them in git history. We process this history to reconstruct discrete outage events.
          </p>
        </div>

        {/* Event detection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">How we define an outage event</h3>
          <p>
            We filter to Orleans Parish zip codes and aggregate the total customers without
            power across the parish. An {"\""}outage event{"\""} is detected when:
          </p>
          <ul className="text-xs list-disc list-inside space-y-0.5 mt-1">
            <li>
              Total customers affected exceeds {(t.minCustomers || 500).toLocaleString()} for
              at least {t.minDurationMinutes || 60} consecutive minutes
            </li>
            <li>
              The event ends when customers affected drops below the threshold for 30+ minutes
            </li>
            <li>
              Events separated by less than 2 hours are merged (treating them as a single
              outage with intermittent restoration)
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-1">
            This filters out brief flickers and small isolated outages, focusing on events
            with meaningful community-wide impact.
          </p>
        </div>

        {/* ICE methodology */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Economic impact: DOE/LBNL ICE methodology</h3>
          <p>
            The{' '}
            <a href="https://icecalculator.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              Interruption Cost Estimate (ICE) Calculator
            </a>{' '}
            was developed by Lawrence Berkeley National Laboratory (LBNL) for the U.S.
            Department of Energy. It provides standardized per-customer-hour costs based on
            extensive surveys of actual costs incurred during power interruptions — including
            spoiled food, lost business revenue, productivity losses, and inconvenience costs.
          </p>
          <p>
            We use 2024 ICE values for the Southeast census region:
          </p>
          <ul className="text-xs list-disc list-inside space-y-0.5 mt-1">
            <li>
              <span className="font-semibold text-gray-700">Residential:</span>{' '}
              ${a.iceCostResidentialPerCustomerHour.toFixed(2)}/customer-hour — covers spoiled
              food, candles/flashlights, eating out, lost leisure time
            </li>
            <li>
              <span className="font-semibold text-gray-700">Commercial/Industrial:</span>{' '}
              ${a.iceCostCommercialPerCustomerHour.toFixed(2)}/customer-hour — covers lost
              revenue, idle employees, equipment damage, restart costs
            </li>
          </ul>
        </div>

        {/* Customer mix */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Customer mix</h3>
          <p>
            Entergy New Orleans serves a mix of residential and commercial customers. Based on{' '}
            <a href="https://www.eia.gov/electricity/data/eia861/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              EIA Form 861
            </a>{' '}
            (2023), approximately {(a.residentialShareOfCustomers * 100).toFixed(0)}% of
            Entergy New Orleans customers are residential and{' '}
            {(a.commercialShareOfCustomers * 100).toFixed(0)}% are commercial/industrial.
            The outage data does not distinguish customer type, so we apply this mix to the
            total customer-hours to split the impact estimate.
          </p>
        </div>

        {/* Customer-hours */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Customer-hours</h3>
          <p>
            Customer-hours measure the total burden of an outage: the number of customers
            affected multiplied by how long they were affected. An outage that leaves 1,000
            customers without power for 3 hours is 3,000 customer-hours — the same as 3,000
            customers without power for 1 hour. Each 15-minute snapshot contributes
            (customers affected × 0.25 hours) to the running total.
          </p>
        </div>

        {/* Data sources */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Data sources</h3>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>
              <a href="https://github.com/patricktrainer/entergy-outages" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                patricktrainer/entergy-outages
              </a>{' '}
              — automated Entergy outage snapshots (every 15 min since July 2022)
            </li>
            <li>
              <a href="https://icecalculator.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                DOE/LBNL ICE Calculator
              </a>{' '}
              — interruption cost estimates by customer type and region
            </li>
            <li>
              <a href="https://www.eia.gov/electricity/data/eia861/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                EIA Form 861
              </a>{' '}
              — utility customer counts by class
            </li>
          </ul>
        </div>

        {/* Formulas toggle */}
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="text-sm text-yellow-600 hover:text-yellow-800 font-medium cursor-pointer"
          >
            {showFormulas ? '▾ Hide formulas' : '▸ Show formulas'}
          </button>

          {showFormulas && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono text-gray-700 space-y-3">
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Event detection</p>
                <p>Event starts when: total_customers_affected &gt; {t.minCustomers || 500} for {t.minDurationMinutes || 60}+ minutes</p>
                <p>Event ends when: total_customers_affected &lt; {t.minCustomers || 500} for 30+ minutes</p>
                <p>Events within 2 hours are merged</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Economic impact</p>
                <p>customer_hours = sum(customers_affected × 0.25) for each 15-min snapshot</p>
                <p>residential_impact = customer_hours × {a.residentialShareOfCustomers} × ${a.iceCostResidentialPerCustomerHour.toFixed(2)}</p>
                <p>commercial_impact = customer_hours × {a.commercialShareOfCustomers} × ${a.iceCostCommercialPerCustomerHour.toFixed(2)}</p>
                <p>total_impact = residential_impact + commercial_impact</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 italic">
          ICE values represent average costs across a range of outage types and durations.
          Actual costs for any specific outage depend on time of day, season, weather conditions,
          and the specific mix of customers affected.
        </p>
      </div>
    </div>
  );
}
