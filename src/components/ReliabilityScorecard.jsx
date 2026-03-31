import { useState } from 'react';
import { formatDollars, formatNumber } from '../lib/swbImpact';

export default function ReliabilityScorecard({ stats }) {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <div className="mb-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-cyan-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-cyan-700">
          {formatNumber(stats.totalHours)}
        </p>
        <p className="text-xs text-cyan-600 font-medium">Hours of Disruption</p>
        <p className="text-[10px] text-cyan-500 mt-0.5">Since 2022</p>
      </div>
      <div className="bg-teal-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-teal-700">
          {formatNumber(stats.totalPersonDays)}
        </p>
        <p className="text-xs text-teal-600 font-medium">Person-Days Affected</p>
        <p className="text-[10px] text-teal-500 mt-0.5">Since 2022</p>
      </div>
      <div className="bg-red-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-red-700">
          {formatDollars(stats.conservativeTotal)} – {formatDollars(stats.fullTotal)}
        </p>
        <p className="text-xs text-red-600 font-medium">Estimated Economic Cost</p>
        <p className="text-[10px] text-red-500 mt-0.5">Since 2022</p>
      </div>
      <div className={`rounded-lg px-2 sm:px-4 py-3 text-center ${
        stats.activeAdvisories > 0 ? 'bg-amber-50' : 'bg-green-50'
      }`}>
        <p className={`text-xl sm:text-2xl font-bold ${
          stats.activeAdvisories > 0 ? 'text-amber-700' : 'text-green-700'
        }`}>
          {stats.activeAdvisories}
        </p>
        <p className={`text-xs font-medium ${
          stats.activeAdvisories > 0 ? 'text-amber-600' : 'text-green-600'
        }`}>
          Active Advisory{stats.activeAdvisories !== 1 ? 'ies' : 'y'}
        </p>
        <p className={`text-[10px] mt-0.5 ${
          stats.activeAdvisories > 0 ? 'text-amber-500' : 'text-green-500'
        }`}>
          {stats.activeAdvisories > 0 ? 'Boil water in effect' : 'No active advisories'}
        </p>
      </div>
    </div>
    <button
      onClick={() => setShowMethodology(!showMethodology)}
      className="mt-3 text-[11px] text-cyan-600 hover:text-cyan-800 font-medium cursor-pointer"
    >
      {showMethodology ? '▾ Hide methodology' : '▸ How we calculate these numbers'}
    </button>
    {showMethodology && (
      <div className="mt-2 bg-cyan-50 border border-cyan-100 rounded-lg p-3 text-[11px] text-gray-600 space-y-1.5">
        <p>
          <span className="font-semibold text-gray-700">Two-tier model:</span>{' '}
          Each incident is estimated at both conservative and full levels. Restaurant counts are
          estimated per incident based on neighborhood commercial density (FQ/CBD ~1 per 40 residents,
          Uptown ~1 per 250, NO East ~1 per 1,000). Restaurants are split into those that close
          (workers lose wages) and those that adapt (bear extra costs for bottled water, ice, and reduced covers).
        </p>
        <p>
          <span className="font-semibold text-gray-700">Closure rates:</span>{' '}
          Main breaks: 40% (conservative) / 60% (full) — physical access blocked.
          Boil water advisories: 10% / 20% — most restaurants adapt and stay open.
          Plus: childcare-forced absence and productivity loss for all workers.
        </p>
        <p>
          <span className="font-semibold text-gray-700">Benchmark:</span>{' '}
          Our estimates (~$26–$60/household/day) are conservative relative to the Water Research
          Foundation{"'"}s per-household interruption costs ($50–$100/household/day) and well below
          FEMA{"'"}s BCA values for complete water loss ($83–$170/person/day).
        </p>
        <p>
          <span className="font-semibold text-gray-700">Sources:</span>{' '}
          Wages from BLS OES (NOLA MSA median $16.50/hr). Labor force from BLS LAUS (58%).
          Household data from Census ACS 2023. Incidents from{' '}
          <a href="https://www.swbno.org/PressReleases" target="_blank" rel="noopener noreferrer" className="text-cyan-700 hover:underline">
            S&WB press releases
          </a>.
        </p>
      </div>
    )}
    </div>
  );
}
