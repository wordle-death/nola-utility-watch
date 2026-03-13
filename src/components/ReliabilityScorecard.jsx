import { formatDollars, formatNumber } from '../lib/swbImpact';

export default function ReliabilityScorecard({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
  );
}
