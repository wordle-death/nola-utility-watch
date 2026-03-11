import { useState } from 'react';
import { computeIncidentImpact, formatDollars, formatNumber, getIncidentDurationHours } from '../lib/swbImpact';

const TYPE_LABELS = {
  main_break: 'Main Break',
  boil_water: 'Boil Water',
  pressure_loss: 'Low Pressure',
  sewage_overflow: 'Sewage Overflow',
  pump_failure: 'Pump Failure',
};

const TYPE_COLORS = {
  main_break: 'bg-red-100 text-red-700',
  boil_water: 'bg-amber-100 text-amber-700',
  pressure_loss: 'bg-orange-100 text-orange-700',
  sewage_overflow: 'bg-purple-100 text-purple-700',
  pump_failure: 'bg-gray-100 text-gray-700',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const INITIAL_VISIBLE = 5;

export default function IncidentList({ incidents, assumptions }) {
  const [showAll, setShowAll] = useState(false);

  // Sort most recent first
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const remaining = sorted.length - INITIAL_VISIBLE;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Incident Details
        <span className="text-gray-400 font-normal ml-1">({sorted.length} total)</span>
      </h4>
      <div className="space-y-4">
        {visible.map(inc => (
          <IncidentCard key={inc.id} incident={inc} assumptions={assumptions} />
        ))}
      </div>
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-2 text-sm text-cyan-600 hover:text-cyan-800 font-medium bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer"
        >
          Show {remaining} more incident{remaining !== 1 ? 's' : ''} (back to 2022)
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

function IncidentCard({ incident, assumptions }) {
  const [expanded, setExpanded] = useState(false);

  const conserv = computeIncidentImpact(incident, assumptions, 'conservative');
  const full = computeIncidentImpact(incident, assumptions, 'full');
  const hours = getIncidentDurationHours(incident);
  const isOngoing = !incident.endDate;
  const advisoryOngoing = incident.boilWaterAdvisory && !incident.advisoryEndDate;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[incident.type] || 'bg-gray-100 text-gray-700'}`}>
              {TYPE_LABELS[incident.type] || incident.type}
            </span>
            {isOngoing && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                Ongoing
              </span>
            )}
            {advisoryOngoing && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Boil Water Active
              </span>
            )}
          </div>
          <h5 className="font-semibold text-gray-900 text-sm">{incident.title}</h5>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(incident.date)}
            {incident.endDate && ` – ${formatDate(incident.endDate)}`}
            {isOngoing && ' – present'}
            {' · '}
            {isOngoing ? `${Math.round(hours)}+ hours` : `${Math.round(hours)} hours`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-red-700">
            {formatDollars(conserv.total)} – {formatDollars(full.total)}
          </p>
          <p className="text-[10px] text-gray-500">Estimated impact</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-2">{incident.description}</p>

      {/* Neighborhoods & population */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">
          ~{formatNumber(incident.estimatedPopulationAffected)} people affected
        </span>
        <span className="text-xs text-gray-400">·</span>
        {incident.neighborhoods.map(n => (
          <span key={n} className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded">
            {n}
          </span>
        ))}
      </div>

      {/* Impact breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Lost wages</span>
          <span className="text-gray-700 font-medium">{formatDollars(conserv.lostWages)} – {formatDollars(full.lostWages)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Bottled water</span>
          <span className="text-gray-700 font-medium">{formatDollars(conserv.bottledWater)} – {formatDollars(full.bottledWater)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Business losses</span>
          <span className="text-gray-700 font-medium">{formatDollars(conserv.businessLoss)} – {formatDollars(full.businessLoss)}</span>
        </div>
        {full.childcare > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Childcare</span>
            <span className="text-gray-700 font-medium">– {formatDollars(full.childcare)}</span>
          </div>
        )}
      </div>

      {/* Sources */}
      {incident.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 mb-2">
          {incident.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {s.name}
            </a>
          ))}
        </div>
      )}

      {/* Expandable methodology */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-cyan-600 hover:text-cyan-800 font-medium cursor-pointer"
      >
        {expanded ? '▾ Hide methodology' : '▸ How we calculated this'}
      </button>

      {expanded && (
        <div className="mt-2 bg-white border border-gray-100 rounded p-3 text-[11px] text-gray-600 space-y-1.5">
          <p>
            <span className="font-semibold text-gray-700">Conservative estimate:</span>{' '}
            Lost wages = {formatNumber(incident.estimatedPopulationAffected)} people × 58% labor force × 55% hourly × $16.50/hr × {Math.round(hours)} hrs × 15% disruption factor.
            Bottled water = {formatNumber(incident.estimatedPopulationAffected)} × $3.50/day × {conserv.durationDays.toFixed(1)} days.
            Business = 15 restaurants × $800/day.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Full estimate adds:</span>{' '}
            Higher disruption factor (35%), expanded supply costs ($5/person/day), 20 additional small businesses × $400/day,
            childcare disruption (12% of pop × $75/day).
          </p>
          <p>
            <span className="font-semibold text-gray-700">Sources:</span>{' '}
            Wages from BLS OES (NOLA MSA median). Labor force from BLS LAUS. Household data from Census ACS 2023.
          </p>
        </div>
      )}

      {/* Notes */}
      {incident.notes && (
        <p className="text-[10px] text-gray-400 mt-1 italic">{incident.notes}</p>
      )}
    </div>
  );
}
