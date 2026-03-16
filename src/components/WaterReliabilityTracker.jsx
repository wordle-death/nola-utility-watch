import swbData from '../data/swbIncidents.json';
import { computeAggregateStats } from '../lib/swbImpact';
import ReliabilityScorecard from './ReliabilityScorecard';
import IncidentTimeline from './IncidentTimeline';
import YearOverYearSummary from './YearOverYearSummary';
import IncidentList from './IncidentList';

export default function WaterReliabilityTracker() {
  const { incidents, assumptions } = swbData;
  const stats = computeAggregateStats(incidents, assumptions);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Water Reliability Tracker
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tracking water main breaks, boil water advisories, and their economic impact on
          New Orleans residents. Data sourced from S&WB official press releases (swbno.org).
        </p>
      </div>

      {/* Hero stats */}
      <ReliabilityScorecard stats={stats} />

      {/* Year-over-year table */}
      <YearOverYearSummary incidents={incidents} assumptions={assumptions} />

      {/* Quarterly chart */}
      <IncidentTimeline incidents={incidents} assumptions={assumptions} />

      {/* Incident cards */}
      <IncidentList incidents={incidents} assumptions={assumptions} />

      {/* Data note */}
      <p className="text-xs text-gray-500 mt-4">
        Economic estimates use a two-tier model (conservative and full) with sourced assumptions
        from the Bureau of Labor Statistics and U.S. Census. Click "How we calculated this" on
        any incident for the full methodology. Last updated: {swbData.lastUpdated}.
      </p>
    </div>
  );
}
