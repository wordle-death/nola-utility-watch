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

        {/* Category 1: Restaurant impact */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">1. Restaurant impact (closures + adaptation)</h3>
          <p>
            During a boil water advisory, restaurants face two outcomes: some close entirely
            (workers lose shifts), while others stay open but bear significant adaptation costs —
            purchasing bottled water for cooking and beverages, buying ice, switching to disposable
            supplies, and absorbing reduced customer traffic.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Restaurant counts</span> are estimated
            per incident based on neighborhood commercial density. The French Quarter and CBD have
            ~1 restaurant per 30-50 residents (tourism-driven), Uptown/Magazine St ~1 per 250
            (dense dining corridor), while New Orleans East and the Lower 9th Ward have ~1 per
            1,000 (primarily residential). This means a boil water advisory covering Uptown
            affects far more restaurants than one covering the same population in NO East.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Closure rates</span> differ by incident
            type. Main breaks physically block street access, forcing {((a.mainBreakClosureRate || 0.40) * 100).toFixed(0)}% (conservative)
            to {((a.mainBreakClosureRateFull || 0.60) * 100).toFixed(0)}% (full) of nearby restaurants to close.
            Boil water advisories allow adaptation — only {((a.boilWaterClosureRate || 0.10) * 100).toFixed(0)}%
            to {((a.boilWaterClosureRateFull || 0.20) * 100).toFixed(0)}% close entirely.
          </p>
          <p>
            Closed restaurants: {a.workersPerRestaurant || 5} workers/shift (conservative) or{' '}
            {a.workersPerRestaurantFull || 8} (full) × ${a.avgHourlyWage.toFixed(2)}/hr (from{' '}
            <a href="https://www.bls.gov/oes/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS OES
            </a>
            , May 2024) + ${a.restaurantOperationalLossPerDay || 300}/day operational losses (spoiled inventory, fixed costs).
            Adapting restaurants: ${a.adaptationCostPerRestaurantPerDay || 200}/day (conservative) or{' '}
            ${a.adaptationCostPerRestaurantPerDayFull || 350}/day (full) for bottled water, ice,
            disposable supplies, and reduced covers.
          </p>
        </div>

        {/* Category 2: Childcare impacts */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">2. Childcare impacts (absence + out-of-pocket)</h3>
          <p>
            When schools and daycares close during a boil water advisory, working parents with
            young children face one of three outcomes:
          </p>
          <ul className="text-xs list-disc list-inside space-y-0.5 mt-1 mb-2">
            <li>
              <span className="font-semibold text-gray-700">Call out of work</span> ({((a.childcareAbsenceRate || 0.25) * 100).toFixed(0)}% conservative / {((a.childcareAbsenceRateFull || 0.35) * 100).toFixed(0)}% full) — no backup care available, parent stays home and loses wages
            </li>
            <li>
              <span className="font-semibold text-gray-700">Pay for emergency care</span> ({((a.paidCareRate || 0.15) * 100).toFixed(0)}% conservative / {((a.paidCareRateFull || 0.25) * 100).toFixed(0)}% full) — parent finds a last-minute sitter or emergency arrangement and pays ~$75/day out of pocket
            </li>
            <li>
              <span className="font-semibold text-gray-700">Find free arrangements</span> (60% conservative / 40% full) — family, neighbors, or flexible employer absorbs the disruption with no direct cost beyond the productivity loss already captured in Category 3
            </li>
          </ul>
          <p>
            These groups are mutually exclusive — a parent either stays home, pays for care, or
            finds a free arrangement. We start with the ~12% of the affected population living in
            households with children under 6 (from Census ACS 2023, Orleans Parish). Of those,{' '}
            {(a.laborForceParticipation * 100).toFixed(0)}% are in the labor force (from{' '}
            <a href="https://www.bls.gov/lau/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              BLS Local Area Unemployment Statistics
            </a>
            ). The absence and paid-care rates are then applied to this working-parent subset.
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
            {((a.productivityFactor || 0.05) * 100).toFixed(0)}%</span> factor represents roughly 24 minutes
            of lost productivity per 8-hour workday — a defensible floor.
            The <span className="font-semibold text-gray-700">full{' '}
            {((a.productivityFactorFull || 0.12) * 100).toFixed(0)}%</span> factor (~58 minutes per workday) captures
            broader impacts: waiting in lines at stores with limited supply, inability to prepare
            meals normally, stress and distraction from managing household logistics.
            Both factors are applied to work hours only (8 hours per day of advisory duration),
            not raw clock hours.
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
            Separate from worker wages, closed restaurants incur non-labor costs:
            spoiled food and perishable inventory, fixed lease and utility costs that accrue
            regardless of operations, and lost profit margin. We estimate{' '}
            ${(a.restaurantOperationalLossPerDay || 300).toLocaleString()}/day per closed restaurant.
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
                <p className="text-gray-500 font-sans mb-1">Closure rate: {((a.mainBreakClosureRate || 0.40) * 100).toFixed(0)}% main break / {((a.boilWaterClosureRate || 0.10) * 100).toFixed(0)}% boil water</p>
                <p>Closure wages = restaurants × closureRate × {a.workersPerRestaurant || 5} workers × ${a.avgHourlyWage} × workHours</p>
                <p>Adaptation costs = restaurants × (1 - closureRate) × ${a.adaptationCostPerRestaurantPerDay || 200}/day × days</p>
                <p>Closure operational = restaurants × closureRate × ${a.restaurantOperationalLossPerDay || 300} × days</p>
                <p>Childcare absence = population × 0.12 × {a.laborForceParticipation} × {a.childcareAbsenceRate || 0.25} × ${a.avgHourlyWage} × workHours</p>
                <p>Childcare out-of-pocket = population × 0.12 × {a.laborForceParticipation} × {a.paidCareRate || 0.15} × $75 × days</p>
                <p>Productivity loss = population × {a.laborForceParticipation} × ${a.avgHourlyWage} × workHours × {a.productivityFactor || 0.05}</p>
                <p className="text-gray-500">workHours = advisory duration ÷ 24 × 8 hrs/day</p>
                <p>Bottled water = population × ${a.bottledWaterCostPerPersonPerDay.toFixed(2)} × days</p>
                <p className="text-gray-500">[Main breaks] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDay || 500} × days</p>
                <p className="text-gray-500">[Main breaks] Property damage = ${(a.mainBreakPropertyDamagePerIncident || 2500).toLocaleString()} per incident</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 font-sans mb-1">Full estimate</p>
                <p className="text-gray-500 font-sans mb-1">Closure rate: {((a.mainBreakClosureRateFull || 0.60) * 100).toFixed(0)}% main break / {((a.boilWaterClosureRateFull || 0.20) * 100).toFixed(0)}% boil water</p>
                <p>Closure wages = restaurants × closureRate × {a.workersPerRestaurantFull || 8} workers × ${a.avgHourlyWage} × workHours</p>
                <p>Adaptation costs = restaurants × (1 - closureRate) × ${a.adaptationCostPerRestaurantPerDayFull || 350}/day × days</p>
                <p>Closure operational = restaurants × closureRate × ${a.restaurantOperationalLossPerDay || 300} × days</p>
                <p>Childcare absence = population × 0.12 × {a.laborForceParticipation} × {a.childcareAbsenceRateFull || 0.35} × ${a.avgHourlyWage} × workHours</p>
                <p>Childcare out-of-pocket = population × 0.12 × {a.laborForceParticipation} × {a.paidCareRateFull || 0.25} × $75 × days</p>
                <p>Productivity loss = population × {a.laborForceParticipation} × ${a.avgHourlyWage} × workHours × {a.productivityFactorFull || 0.12}</p>
                <p>Bottled water = population × $5.00 × days</p>
                <p className="text-gray-500">[Main breaks] Road closure = {a.mainBreakAffectedBusinesses || 8} businesses × ${a.mainBreakFootTrafficLossPerDayFull || 800} × days</p>
                <p className="text-gray-500">[Main breaks] Property damage = ${(a.mainBreakPropertyDamagePerIncidentFull || 7500).toLocaleString()} per incident</p>
              </div>
            </div>
          )}
        </div>

        {/* Benchmark context */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">How our estimates compare</h3>
          <p>
            Our model produces approximately <span className="font-semibold text-gray-700">$11–$25 per person per day</span> ($26–$60 per household per day),
            depending on the incident. For context, two established federal/research benchmarks:
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside mt-1">
            <li>
              <span className="font-semibold text-gray-700">Water Research Foundation (Project #4626):</span>{' '}
              $50–$100 per household per day for water service disruptions — our estimates fall in the lower half of this range
            </li>
            <li>
              <span className="font-semibold text-gray-700">FEMA BCA Toolkit:</span>{' '}
              $83–$170 per person per day for complete water service loss — significantly higher than our estimates,
              as FEMA models full outages (no water at all) rather than boil water advisories where water still flows
            </li>
          </ul>
          <p className="mt-1">
            Our bottom-up model is generally conservative relative to these benchmarks. We use the granular
            approach because it makes each assumption transparent and shows where costs fall — on businesses,
            on working parents, on all residents — rather than applying a single aggregate rate.
          </p>
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
