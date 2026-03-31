import { useState, useEffect } from 'react';
import outageData from '../data/entergyOutages.json';
import { computeAggregateOutageStats } from '../lib/electricityImpact';
import ElectricityScorecard from './ElectricityScorecard';
import OutageTimeline from './OutageTimeline';
import OutageList from './OutageList';

export default function ElectricityTracker() {
  const { events, assumptions } = outageData;
  const stats = computeAggregateOutageStats(events, assumptions);

  const [liveStatus, setLiveStatus] = useState(null);

  useEffect(() => {
    fetch('/api/entergy-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLiveStatus(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Electricity Outage Tracker
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tracking power outages affecting Orleans Parish and their economic impact on
          New Orleans residents. Data sourced from Entergy's public outage reporting system.
        </p>
      </div>

      <ElectricityScorecard stats={stats} liveStatus={liveStatus} />

      <OutageTimeline events={events} assumptions={assumptions} />

      <OutageList events={events} assumptions={assumptions} />

      <p className="text-xs text-gray-500 mt-4">
        Economic estimates use the DOE/LBNL Interruption Cost Estimate (ICE) methodology — the
        federal standard for valuing power interruption costs. Click "How we calculated this" on
        any event for the full methodology. Last updated: {outageData.lastUpdated}.
      </p>
    </div>
  );
}
