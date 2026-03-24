import { useState } from 'react';
import swbData from '../data/swbIncidents.json';

export default function WaterMethodology() {
  const [showFormulas, setShowFormulas] = useState(false);
  const a = swbData.assumptions;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Analysis</h2>
      <div className="prose prose-sm text-gray-600 space-y-4">

        <p>
          This tracker documents every boil water advisory and water main break
          affecting New Orleans residents since 2022, and estimates the economic
          impact on working families. All cost estimates are presented as a range
          between a <span className="font-semibold text-gray-700">conservative</span> floor
          and a <span className="font-semibold text-gray-700">full</span> estimate
          that captures broader ripple effects.
        </p>

        <p>
          We model economic harm in three distinct categories to avoid double-counting
          and to make each assumption transparent and independently defensible.
        </p>

        {/* Population estimation */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">How we estimate affected population</h3>
          <p>
            The Sewerage & Water Board{"'"}s press releases do not include population counts.
            We estimate affected populations using U.S. Census ACS 2022 5-year estimates for
            Orleans Parish neighborhoods and Census tracts. When S&WB describes the scope of
            an advisory, we scale accordingly: {"\""}limited parts{"\""} of a neighborhood = ~30-50%
            of that area{"'"}s population, {"\""}majority{"\""} = ~70%, and {"\""}entire{"\""} = ~90%.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Reference sizes: Orleans Parish ~383K, East Bank ~355K, New Orleans East ~63K,
            Uptown ~50K, Gentilly ~32K, Algiers/Westbank ~28K, Mid-City ~22K.
          </p>
        </div>

        {/* Category 1: Business closure wages */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">1. Business closure wages</h3>
          <p>
            During a boil water advisory, restaurants and food-service businesses face mandatory
            closures or severely reduced operations. Workers at these businesses lose their
            scheduled shifts entirely — this is direct, measurable wage loss.
          </p>
          <p>
            We estimate {a.restaurantsPerZone} restaurants per affected zone with{' '}
            {a.workersPerRestaurant || 5} on-shift workers each (conservative) or{' '}
            {a.workersPerRestaurantFull || 8} (full, including back-of-house and part-time staff).
            The full estimate adds 20 other small businesses (laundromats, salons, cafes) with{' '}
            {a.workersPerSmallBiz || 4} workers each — businesses that depend on running water
            for their core operations. All workers are valued at the median hourly wage of{' '}
            ${a.avgHourlyWage.toFixed(2)} (from{' '}
            <a href="https://www.bls.gov/oes/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Occupational Employment Statistics
            </a>
            , May 2024, NOLA-Metairie MSA).
          </p>
        </div>

        {/* Category 2: Childcare-forced absence */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">2. Childcare-forced absence</h3>
          <p>
            When schools and daycares close or send children home during a boil water advisory,
            some working parents have no choice but to stay home — missing work and losing wages.
            Not all parents are affected equally: some have backup care options (family, friends,
            flexible employers), while others do not.
          </p>
          <p>
            We start with the ~12% of the affected population living in households with children
            under 6 (from Census ACS 2023, Orleans Parish). Of those, {(a.laborForceParticipation * 100).toFixed(0)}% are
            in the labor force (from{' '}
            <a href="https://www.bls.gov/lau/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Local Area Unemployment Statistics
            </a>
            ). We then apply a {"\""}no backup care{"\""}  rate:{' '}
            {((a.childcareAbsenceRate || 0.25) * 100).toFixed(0)}% conservative,{' '}
            {((a.childcareAbsenceRateFull || 0.40) * 100).toFixed(0)}% full — representing the
            share of working parents who must miss work entirely because they have no alternative
            childcare arrangement.
          </p>
        </div>

        {/* Category 3: Productivity loss */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">3. Productivity loss (all workers)</h3>
          <p>
            Even workers who aren{"'"}t forced to stay home lose time during a boil water advisory.
            This applies to <em>everyone</em> in the labor force — hourly workers, salaried
            employees, and remote workers alike. Time is spent boiling water for drinking and
            cooking, making trips to buy bottled water, dealing with disrupted meal routines,
            and managing the general inconvenience of unreliable water service.
          </p>
          <p>
            The <span className="font-semibold text-gray-700">conservative{' '}
            {((a.productivityFactor || 0.05) * 100).toFixed(0)}%</span> factor represents roughly 30 minutes
            of lost productivity per 12-hour disruption period — a defensible floor.
            The <span className="font-semibold text-gray-700">full{' '}
            {((a.productivityFactorFull || 0.12) * 100).toFixed(0)}%</span> factor (~1.5 hours) captures
            broader impacts: waiting in lines at stores with limited supply, inability to prepare
            meals normally, stress and distraction from managing household logistics.
          </p>
          <p>
            We apply this to the full labor force ({(a.laborForceParticipation * 100).toFixed(0)}% of
            affected population, from{' '}
            <a href="https://www.bls.gov/lau/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS LAUS
            </a>
            ), valued at the median hourly wage of ${a.avgHourlyWage.toFixed(2)}.
          </p>
        </div>

        {/* Business operational losses */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Business operational losses</h3>
          <p>
            Separate from worker wages, businesses incur non-labor costs when forced to close:
            spoiled food and perishable inventory, fixed lease and utility costs that accrue
            regardless of operations, and lost profit margin. We estimate{' '}
            ${(a.restaurantOperationalLossPerDay || 300).toLocaleString()}/day per restaurant
            (conservative). The full estimate adds 20 other small businesses at{' '}
            ${(a.otherSmallBizOperationalLossPerDay || 150).toLocaleString()}/day each.
          </p>
        </div>

        {/* Childcare out-of-pocket */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Childcare out-of-pocket costs</h3>
          <p>
            Included in the full estimate only. This captures a different group than the childcare
            absence category above: families who <em>do</em> find emergency childcare (a relative,
            a neighbor, a last-minute sitter) but must pay for it. Estimated at $75/day per
            household with children under 6 (~12% of affected population, from Census ACS 2023).
          </p>
        </div>

        {/* Bottled water */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Bottled water & supplies</h3>
          <p>
            The conservative estimate of ${a.bottledWaterCostPerPersonPerDay.toFixed(2)}/person/day
            assumes approximately 1 gallon per person per day at retail (~$1.50/gallon) plus
            additional costs for cooking and hygiene needs. The full estimate of $5.00/person/day
            adds ice, extra supplies, and accounts for premium pricing when stores experience
            runs on water during advisories.
          </p>
        </div>

        {/* Infrastructure impacts */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Infrastructure impacts (main breaks only)</h3>
          <p>
            When a water main physically breaks, the area around the break (typically 1-2 blocks)
            is closed for heavy equipment access and excavation. This causes additional economic
            harm beyond the boil water advisory itself: approximately {a.mainBreakAffectedBusinesses || 8} nearby
            businesses lose foot traffic (${a.mainBreakFootTrafficLossPerDay || 500}/day conservative,
            ${a.mainBreakFootTrafficLossPerDayFull || 800}/day full), and flooding from the break
            causes property damage to adjacent buildings and ground-floor businesses
            (${(a.mainBreakPropertyDamagePerIncident || 2500).toLocaleString()} conservative,
            ${(a.mainBreakPropertyDamagePerIncidentFull || 7500).toLocaleString()} full, per incident).
          </p>
        </div>

        {/* Data sources */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Data sources</h3>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>
              <a href="https://www.bls.gov/oes/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                BLS Occupational Employment Statistics
              </a>{' '}
              — median hourly wage, NOLA-Metairie MSA (May 2024)
            </li>
            <li>
              <a href="https://www.bls.gov/lau/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                BLS Local Area Unemployment Statistics
              </a>{' '}
              — labor force participation rate
            </li>
            <li>
              <a href="https://data.census.gov/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                U.S. Census ACS 2022/2023
              </a>{' '}
              — household size, population by neighborhood, households with young children
            </li>
            <li>
              <a href="https://www.swbno.org/PressReleases" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                S&WB Press Releases
              </a>{' '}
              — incident dates, affected areas, advisory durations
            </li>
          </ul>
        </div>

        {/* Formulas toggle */}
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="text-sm text-cyan-600 hover:text-cyan-800 font-medium cursor-pointer"
          >
            {showFormulas ? '▾ Hide formulas' : '▸ Show formulas'}
          </button>

          {showFormulas && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono text-gray-700 space-y-3">
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Conservative estimate</p>
                <p>Business closure wages = {a.restaurantsPerZone} restaurants × {a.workersPerRestaurant || 5} workers × ${a.avgHourlyWage} × hours</p>
                <p>Childcare absence = population × 0.12 × {a.laborForceParticipation} × {a.childcareAbsenceRate || 0.25} × ${a.avgHourlyWage} × hours</p>
                <p>Productivity loss = population × {a.laborForceParticipation} × ${a.avgHourlyWage} × hours × {a.productivityFactor || 0.05}</p>
                <p>Bottled water = population × ${a.bottledWaterCostPerPersonPerDay.toFixed(2)} × days</p>
                <p>Business operational = {a.restaurantsPerZone} × ${a.restaurantOperationalLossPerDay || 300} × days</p>
                <p className="text-gray-500">[Main breaks] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDay || 500} × days</p>
                <p className="text-gray-500">[Main breaks] Property damage = ${(a.mainBreakPropertyDamagePerIncident || 2500).toLocaleString()} per incident</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Full estimate</p>
                <p>Business closure wages = ({a.restaurantsPerZone} × {a.workersPerRestaurantFull || 8} + 20 × {a.workersPerSmallBiz || 4}) × ${a.avgHourlyWage} × hours</p>
                <p>Childcare absence = population × 0.12 × {a.laborForceParticipation} × {a.childcareAbsenceRateFull || 0.40} × ${a.avgHourlyWage} × hours</p>
                <p>Productivity loss = population × {a.laborForceParticipation} × ${a.avgHourlyWage} × hours × {a.productivityFactorFull || 0.12}</p>
                <p>Bottled water = population × $5.00 × days</p>
                <p>Business operational = ({a.restaurantsPerZone} × ${a.restaurantOperationalLossPerDay || 300} + 20 × ${a.otherSmallBizOperationalLossPerDay || 150}) × days</p>
                <p>Childcare out-of-pocket = population × 0.12 × $75 × days</p>
                <p className="text-gray-500">[Main breaks] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDayFull || 800} × days</p>
                <p className="text-gray-500">[Main breaks] Property damage = ${(a.mainBreakPropertyDamagePerIncidentFull || 7500).toLocaleString()} per incident</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 italic">
          These estimates are illustrative — designed to make the economic burden of water infrastructure
          failures visible and comparable across incidents. Actual costs vary based on time of day,
          season, specific businesses affected, and individual circumstances.
        </p>
      </div>
    </div>
  );
}
