import { useState } from 'react';
import { formatDollars, formatNumber } from '../lib/electricityImpact';

export default function ElectricityScorecard({ stats, liveStatus }) {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <div className="mb-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-yellow-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-yellow-700">
          {formatNumber(stats.eventCount)}
        </p>
        <p className="text-xs text-yellow-600 font-medium">Outage Events</p>
        <p className="text-[10px] text-yellow-500 mt-0.5">Since 2022</p>
      </div>
      <div className="bg-orange-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-orange-700">
          {formatNumber(stats.totalCustomerHours)}
        </p>
        <p className="text-xs text-orange-600 font-medium">Customer-Hours Lost</p>
        <p className="text-[10px] text-orange-500 mt-0.5">Since 2022</p>
      </div>
      <div className="bg-red-50 rounded-lg px-2 sm:px-4 py-3 text-center">
        <p className="text-xl sm:text-2xl font-bold text-red-700">
          {formatDollars(stats.totalImpact)}
        </p>
        <p className="text-xs text-red-600 font-medium">Economic Impact (ICE)</p>
        <p className="text-[10px] text-red-500 mt-0.5">DOE/LBNL estimate</p>
      </div>
      <div className={`rounded-lg px-2 sm:px-4 py-3 text-center ${
        liveStatus && liveStatus.customersAffected > 0 ? 'bg-amber-50' : 'bg-green-50'
      }`}>
        {liveStatus ? (
          <>
            <p className={`text-xl sm:text-2xl font-bold ${
              liveStatus.customersAffected > 0 ? 'text-amber-700' : 'text-green-700'
            }`}>
              {liveStatus.customersAffected > 0
                ? formatNumber(liveStatus.customersAffected)
                : '0'}
            </p>
            <p className={`text-xs font-medium ${
              liveStatus.customersAffected > 0 ? 'text-amber-600' : 'text-green-600'
            }`}>
              Currently Without Power
            </p>
            <p className={`text-[10px] mt-0.5 ${
              liveStatus.customersAffected > 0 ? 'text-amber-500' : 'text-green-500'
            }`}>
              {liveStatus.customersAffected > 0 ? 'Outage in progress' : 'All systems normal'}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl sm:text-2xl font-bold text-gray-400">—</p>
            <p className="text-xs text-gray-500 font-medium">Live Status</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Loading...</p>
          </>
        )}
      </div>
    </div>
    <button
      onClick={() => setShowMethodology(!showMethodology)}
      className="mt-3 text-[11px] text-yellow-600 hover:text-yellow-800 font-medium cursor-pointer"
    >
      {showMethodology ? '▾ Hide methodology' : '▸ How we calculate these numbers'}
    </button>
    {showMethodology && (
      <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-[11px] text-gray-600 space-y-1.5">
        <p>
          <span className="font-semibold text-gray-700">DOE/LBNL ICE methodology:</span>{' '}
          Economic impact uses the Interruption Cost Estimate (ICE) Calculator — the federal standard
          for valuing power interruption costs, developed by Lawrence Berkeley National Laboratory.
        </p>
        <p>
          <span className="font-semibold text-gray-700">Calculation:</span>{' '}
          Total customer-hours × (78% residential × $3.50/customer-hr + 22% commercial × $45.00/customer-hr).
          Customer mix from EIA Form 861 (Entergy New Orleans, 2023).
        </p>
        <p>
          <span className="font-semibold text-gray-700">Inclusion criteria:</span>{' '}
          Events with 250+ customers affected and 60+ minute duration. Data from{' '}
          <a href="https://github.com/patricktrainer/entergy-outages" target="_blank" rel="noopener noreferrer" className="text-yellow-700 hover:underline">
            Entergy outage monitoring
          </a>{' '}
          (Apache 2.0 license).
        </p>
      </div>
    )}
    </div>
  );
}
