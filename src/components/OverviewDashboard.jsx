import { useState, useEffect } from 'react';
import swbData from '../data/swbIncidents.json';
import outageData from '../data/entergyOutages.json';
import { computeAggregateStats, formatDollars, formatNumber } from '../lib/swbImpact';
import { computeAggregateOutageStats } from '../lib/electricityImpact';

export default function OverviewDashboard({ onNavigate }) {
  const waterStats = computeAggregateStats(swbData.incidents, swbData.assumptions);
  const elecStats = computeAggregateOutageStats(outageData.events, outageData.assumptions);

  const [liveStatus, setLiveStatus] = useState(null);
  const [communityCount, setCommunityCount] = useState(null);

  useEffect(() => {
    fetch('/api/entergy-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLiveStatus(data); })
      .catch(() => {});

    fetch('/api/community-stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCommunityCount(data.total_submissions); })
      .catch(() => {});
  }, []);

  const totalEvents = waterStats.incidentCount + elecStats.eventCount;
  const totalImpactLow = waterStats.conservativeTotal + elecStats.totalImpact;
  const totalImpactHigh = waterStats.fullTotal + elecStats.totalImpact;

  const hasActiveIssues =
    waterStats.activeAdvisories > 0 ||
    (liveStatus && liveStatus.customersAffected > 0);

  return (
    <div className="space-y-8">
      {/* Aggregate KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-4 text-center">
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(totalEvents)}
          </p>
          <p className="text-sm text-gray-600 font-medium mt-1">Disruption Events</p>
          <p className="text-xs text-gray-400 mt-0.5">Water + electricity since 2022</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-4 text-center">
          <p className="text-3xl font-bold text-red-700">
            {formatDollars(totalImpactLow)} – {formatDollars(totalImpactHigh)}
          </p>
          <p className="text-sm text-red-600 font-medium mt-1">Estimated Economic Impact</p>
          <p className="text-xs text-red-400 mt-0.5">Combined water + electricity since 2022</p>
        </div>
        <div className={`rounded-xl border px-4 py-4 text-center ${
          hasActiveIssues
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}>
          {hasActiveIssues ? (
            <>
              <p className="text-3xl font-bold text-amber-700">
                {[
                  waterStats.activeAdvisories > 0 && `${waterStats.activeAdvisories} advisory`,
                  liveStatus?.customersAffected > 0 && `${formatNumber(liveStatus.customersAffected)} without power`,
                ].filter(Boolean).join(' + ') || 'Issues detected'}
              </p>
              <p className="text-sm text-amber-600 font-medium mt-1">Active Disruptions</p>
              <p className="text-xs text-amber-400 mt-0.5">See individual trackers for details</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-green-700">All Clear</p>
              <p className="text-sm text-green-600 font-medium mt-1">Live Status</p>
              <p className="text-xs text-green-400 mt-0.5">
                {liveStatus ? 'No active advisories or outages' : 'Checking...'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Utility preview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Water */}
        <button
          onClick={() => onNavigate('water')}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all p-6 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-cyan-500" />
            <h3 className="text-lg font-semibold text-gray-900">Water Reliability</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Tracking boil water advisories and water main breaks from the Sewerage & Water Board,
            with economic impact estimates for affected communities.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Incidents</span>
              <span className="font-semibold text-gray-900">{waterStats.incidentCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Economic impact</span>
              <span className="font-semibold text-red-700">
                {formatDollars(waterStats.conservativeTotal)} – {formatDollars(waterStats.fullTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Person-days affected</span>
              <span className="font-semibold text-gray-900">{formatNumber(waterStats.totalPersonDays)}</span>
            </div>
          </div>
          <span className="text-sm text-cyan-600 font-medium group-hover:text-cyan-800">
            View details →
          </span>
        </button>

        {/* Electricity */}
        <button
          onClick={() => onNavigate('electricity')}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all p-6 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Electricity Outages</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Monitoring Entergy power outages across Orleans Parish, with economic impact
            estimates using the federal DOE/LBNL methodology.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Outage events</span>
              <span className="font-semibold text-gray-900">{formatNumber(elecStats.eventCount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Economic impact</span>
              <span className="font-semibold text-red-700">{formatDollars(elecStats.totalImpact)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer-hours lost</span>
              <span className="font-semibold text-gray-900">{formatNumber(elecStats.totalCustomerHours)}</span>
            </div>
          </div>
          <span className="text-sm text-amber-600 font-medium group-hover:text-amber-800">
            View details →
          </span>
        </button>

        {/* Natural Gas */}
        <button
          onClick={() => onNavigate('gas')}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-6 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Natural Gas</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Analyzing the impact of Delta Utilities{"'"} acquisition of Entergy{"'"}s gas distribution
            on residential bills — including the PGA premium and cumulative cost differences.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Analysis</span>
              <span className="font-semibold text-gray-900">Bill comparison tool</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Key finding</span>
              <span className="font-semibold text-gray-900">PGA premium vs hedging</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Data</span>
              <span className="font-semibold text-gray-900">10+ actual bills analyzed</span>
            </div>
          </div>
          <span className="text-sm text-blue-600 font-medium group-hover:text-blue-800">
            View details →
          </span>
        </button>
      </div>

      {/* Project description */}
      <div className="text-center max-w-2xl mx-auto">
        {communityCount > 0 && (
          <p className="text-sm font-medium text-blue-700 mb-2">
            Built on {communityCount} community-contributed bill{communityCount !== 1 ? 's' : ''} and growing.
          </p>
        )}
        <p className="text-sm text-gray-500">
          NOLA Utility Watch is a free, open-source project providing independent analysis of
          utility costs and reliability in New Orleans. All data is from public sources —
          S&WB press releases, Entergy outage reports, FRED wholesale gas prices, and actual
          residential bills. Economic impact estimates use sourced methodologies from the Bureau
          of Labor Statistics, U.S. Census, and DOE/LBNL.
        </p>
      </div>
    </div>
  );
}
