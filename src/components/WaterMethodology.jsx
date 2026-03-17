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

        {/* Lost wages */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Lost wages</h3>
          <p>
            Not everyone in the affected area loses income during a water disruption. We narrow
            the population in three steps: first, {(a.laborForceParticipation * 100).toFixed(0)}% are
            in the labor force (from{' '}
            <a href="https://www.bls.gov/lau/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Local Area Unemployment Statistics
            </a>{' '}
            for the New Orleans-Metairie MSA). Of those, {(a.hourlyWorkerShare * 100).toFixed(0)}% are
            hourly workers who can{"'"}t easily work remotely (from{' '}
            <a href="https://www.bls.gov/opub/reports/minimum-wage/2023/home.htm" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Characteristics of Minimum Wage Workers
            </a>
            ). We use the median hourly wage of ${a.avgHourlyWage.toFixed(2)} (from{' '}
            <a href="https://www.bls.gov/oes/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Occupational Employment Statistics
            </a>
            , May 2024, NOLA-Metairie MSA).
          </p>
        </div>

        {/* Disruption factor */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Disruption factor (15% vs 35%)</h3>
          <p>
            This is the model{"'"}s most significant assumption. A boil water advisory doesn{"'"}t mean
            everyone misses work entirely — but it does cause partial productivity loss: boiling
            water for drinking and cooking, making trips to buy bottled water, dealing with
            business closures, and general disruption to daily routines.
          </p>
          <p>
            The <span className="font-semibold text-gray-700">conservative 15%</span> factor
            represents roughly 1-2 hours of lost productivity per 12-hour disruption period —
            a defensible floor. The <span className="font-semibold text-gray-700">full 35%</span> factor
            captures broader impacts: waiting in lines at stores, inability to prepare meals
            normally, stress and distraction, and childcare complications when schools or
            daycares are affected.
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

        {/* Business losses */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Restaurant & business losses</h3>
          <p>
            During a boil water advisory, restaurants and food-service businesses face mandatory
            closures or severely reduced operations. We estimate {a.restaurantsPerZone} restaurants
            per affected zone, each losing ${a.restaurantLostRevenuePerDay.toLocaleString()}/day in
            revenue (conservative). The full estimate adds 20 other small businesses (laundromats,
            salons, cafes, etc.) at $400/day each — businesses that depend on running water for
            their core operations.
          </p>
        </div>

        {/* Childcare */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Childcare disruption</h3>
          <p>
            Included in the full estimate only. Approximately 12% of the affected population lives
            in households with children under 6 (from Census ACS 2023, Orleans Parish). When
            daycares close or schools issue early dismissals due to water advisories, families
            face emergency childcare costs estimated at $75/day per household.
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
                <p>Lost wages = population × {a.laborForceParticipation} × {a.hourlyWorkerShare} × ${a.avgHourlyWage} × hours × 0.15</p>
                <p>Bottled water = population × ${a.bottledWaterCostPerPersonPerDay.toFixed(2)} × days</p>
                <p>Business losses = {a.restaurantsPerZone} restaurants × ${a.restaurantLostRevenuePerDay} × days</p>
                <p className="text-gray-500">[Main breaks only] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDay || 500} × days</p>
                <p className="text-gray-500">[Main breaks only] Property damage = ${(a.mainBreakPropertyDamagePerIncident || 2500).toLocaleString()} per incident</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Full estimate</p>
                <p>Lost wages = population × {a.laborForceParticipation} × {a.hourlyWorkerShare} × ${a.avgHourlyWage} × hours × 0.35</p>
                <p>Bottled water = population × $5.00 × days</p>
                <p>Business losses = ({a.restaurantsPerZone} × ${a.restaurantLostRevenuePerDay} + 20 × $400) × days</p>
                <p>Childcare = population × 0.12 × $75 × days</p>
                <p className="text-gray-500">[Main breaks only] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDayFull || 800} × days</p>
                <p className="text-gray-500">[Main breaks only] Property damage = ${(a.mainBreakPropertyDamagePerIncidentFull || 7500).toLocaleString()} per incident</p>
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
