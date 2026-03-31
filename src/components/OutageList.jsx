import { useState } from 'react';
import { computeOutageImpact, formatDollars, formatNumber } from '../lib/electricityImpact';

function formatDateTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const INITIAL_VISIBLE = 5;

export default function OutageList({ events, assumptions }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...events].sort((a, b) => b.startTime.localeCompare(a.startTime));
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const remaining = sorted.length - INITIAL_VISIBLE;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Outage Events
        <span className="text-gray-400 font-normal ml-1">({sorted.length} total)</span>
      </h4>
      <div className="space-y-4">
        {visible.map(event => (
          <OutageCard key={event.id} event={event} assumptions={assumptions} />
        ))}
      </div>
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-2 text-sm text-yellow-600 hover:text-yellow-800 font-medium bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors cursor-pointer"
        >
          Show {remaining} more event{remaining !== 1 ? 's' : ''} (back to 2022)
        </button>
      )}
      {showAll && sorted.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}

function OutageCard({ event, assumptions }) {
  const [expanded, setExpanded] = useState(false);
  const impact = computeOutageImpact(event, assumptions);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              Power Outage
            </span>
            {event.percentageWithoutPower >= 10 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Major ({event.percentageWithoutPower}% without power)
              </span>
            )}
          </div>
          <h5 className="font-semibold text-gray-900 text-sm">
            {formatNumber(event.peakCustomersAffected)} customers at peak
          </h5>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(event.startTime)}
            {event.endTime && ` – ${formatDateTime(event.endTime)}`}
            {' · '}
            {Math.round(event.durationHours)} hours
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-red-700">
            {formatDollars(impact.totalImpact)}
          </p>
          <p className="text-[10px] text-gray-500">ICE estimate</p>
        </div>
      </div>

      {/* Zip codes */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">
          {formatNumber(event.totalCustomerHours)} customer-hours
        </span>
        <span className="text-xs text-gray-400">·</span>
        {event.affectedZipCodes.map(z => (
          <span key={z} className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
            {z}
          </span>
        ))}
      </div>

      {/* Impact breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Residential impact</span>
          <span className="text-gray-700 font-medium">{formatDollars(impact.residentialImpact)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Commercial impact</span>
          <span className="text-gray-700 font-medium">{formatDollars(impact.commercialImpact)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Avg customers affected</span>
          <span className="text-gray-700 font-medium">{formatNumber(event.avgCustomersAffected)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Duration</span>
          <span className="text-gray-700 font-medium">{event.durationHours.toFixed(1)} hours</span>
        </div>
      </div>

      {/* Source link */}
      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 mb-2">
        <a
          href={`https://github.com/patricktrainer/entergy-outages`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Entergy Outage Data (GitHub)
        </a>
      </div>

      {/* Expandable methodology */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="text-[11px] text-yellow-600 hover:text-yellow-800 font-medium cursor-pointer"
      >
        {expanded ? '▾ Hide methodology' : '▸ How we calculated this'}
      </button>

      {expanded && (
        <div className="mt-2 bg-white border border-gray-100 rounded p-3 text-[11px] text-gray-600 space-y-1.5">
          <p>
            <span className="font-semibold text-gray-700">DOE/LBNL ICE methodology:</span>{' '}
            Economic impact is estimated using the Interruption Cost Estimate (ICE) Calculator
            developed by Lawrence Berkeley National Laboratory for the U.S. Department of Energy.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Calculation:</span>{' '}
            {formatNumber(event.totalCustomerHours)} customer-hours × (
            {(assumptions.residentialShareOfCustomers * 100).toFixed(0)}% residential × ${assumptions.iceCostResidentialPerCustomerHour.toFixed(2)}/customer-hr
            + {(assumptions.commercialShareOfCustomers * 100).toFixed(0)}% commercial × ${assumptions.iceCostCommercialPerCustomerHour.toFixed(2)}/customer-hr
            ) = {formatDollars(impact.totalImpact)}.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Sources:</span>{' '}
            ICE Calculator (DOE/LBNL, 2024 Southeast region values). Customer mix from EIA Form 861 (Entergy New Orleans, 2023).
          </p>
        </div>
      )}
    </div>
  );
}
