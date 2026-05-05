import { Component, useState, useEffect } from 'react';
import BillCalculator from './components/BillCalculator';
import CumulativeSavings from './components/CumulativeSavings';
import PGATrendChart from './components/PGATrendChart';
import WaterReliabilityTracker from './components/WaterReliabilityTracker';
import ContributeSection from './components/ContributeSection';
import CommunityStats from './components/CommunityStats';
import TabNav from './components/TabNav';
import WaterMethodology from './components/WaterMethodology';
import ElectricityTracker from './components/ElectricityTracker';
import ElectricityMethodology from './components/ElectricityMethodology';
import OverviewDashboard from './components/OverviewDashboard';
import NewsFeed from './components/NewsFeed';
import { Analytics } from '@vercel/analytics/react';

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <p className="text-lg font-semibold text-gray-900">Something went wrong.</p>
          <p className="text-sm text-gray-500 mt-2">Try refreshing the page. If the problem persists, please report it.</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg text-sm cursor-pointer">
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TABS = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { id: 'water', label: 'Water Reliability', shortLabel: 'Water' },
  { id: 'electricity', label: 'Electricity Outages', shortLabel: 'Electric' },
  { id: 'gas', label: 'Natural Gas', shortLabel: 'Gas' },
];

function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return TABS.some(t => t.id === hash) ? hash : 'overview';
}

function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);

  function navigateTab(tabId) {
    window.location.hash = tabId;
    setActiveTab(tabId);
  }

  // Sync tab when user navigates with back/forward buttons
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Blackouts, Bills, and Boil Orders <span className="whitespace-nowrap">(On the Bayou)</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Independent utility cost analysis for New Orleans residents
              </p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
              Beta
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={navigateTab} />

      <ErrorBoundary>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        <div className={activeTab !== 'overview' ? 'hidden' : ''}>
          <OverviewDashboard onNavigate={navigateTab} />
          <section className="mt-8">
            <NewsFeed />
          </section>
        </div>

        {/* Electricity Outages Tab */}
        <div className={activeTab !== 'electricity' ? 'hidden' : ''}>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Grid reliability:</span> Entergy New Orleans serves
              approximately 195,000 customers in Orleans Parish. Aging infrastructure, severe weather,
              and deferred maintenance contribute to recurring power outages. Below is a tracker of
              significant outage events and their estimated economic impact using the federal DOE/LBNL
              methodology.
            </p>
          </div>
          <section>
            <ElectricityTracker />
          </section>
          <section className="mt-12 mb-12">
            <ElectricityMethodology />
          </section>
        </div>

        {/* Gas Costs Tab */}
        <div className={activeTab !== 'gas' ? 'hidden' : ''}>
          {/* Context banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">What happened:</span> In July 2025, Delta Utilities acquired Entergy{"'"}s gas
              distribution business in New Orleans. Per{' '}
              <a href="https://council.nola.gov/council/media/Assets/Committees/Utility/R-24-791-Gas-Sale.pdf" className="text-blue-700 underline" target="_blank" rel="noopener">
                City Council Resolution R-24-791
              </a>, Delta adopted Entergy{"'"}s base rate schedule — every rate component is identical except the
              Purchase Gas Adjustment (PGA), the commodity pass-through. Entergy had a hedging program that kept
              costs stable. Delta does not. Enter your usage below to see exactly what that means for your bill.
            </p>
          </div>

          <section className="mb-12">
            <BillCalculator />
          </section>

          <section className="mb-12">
            <CumulativeSavings />
          </section>

          <section className="mb-12">
            <PGATrendChart />
          </section>

          <section className="mb-12">
            <ContributeSection />
          </section>

          <section className="mb-12">
            <CommunityStats />
          </section>

          {/* About — gas-specific */}
          <section className="mb-12">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Tool</h2>
              <div className="prose prose-sm text-gray-600 space-y-3">
                <p>
                  Blackouts, Bills, and Boil Orders (On the Bayou) is a free, open-source project providing
                  independent analysis of utility costs in New Orleans.
                </p>
                <p>
                  <span className="font-semibold text-gray-700">The analytical basis:</span> The New Orleans City Council{"'"}s{' '}
                  <a href="https://council.nola.gov/council/media/Assets/Committees/Utility/R-24-791-Gas-Sale.pdf" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    Resolution R-24-791
                  </a>{' '}
                  (December 19, 2024, Docket UD-24-01) approved Delta{"'"}s acquisition of Entergy{"'"}s gas distribution
                  and ordered Delta to adopt Entergy{"'"}s existing base rate schedule. Every rate component — customer
                  charge ($12.32/mo), gas services ($0.266/CCF), Formula Rate Plan Rider (77.47%), franchise fee (5.27%),
                  and city tax (3%) — is identical between the two utilities by Council order. The sole variable is
                  the PGA (Purchase Gas Adjustment), the commodity pass-through that changes monthly.
                </p>
                <p>
                  <span className="font-semibold text-gray-700">What the Council{"'"}s own advisors found:</span> Before
                  approving the transaction, the Council{"'"}s Utility Advisors calculated that the sale would increase
                  Delta{"'"}s cost of service by approximately $16.5 million, resulting in a typical residential bill
                  (50 CCF/month) impact of $12.33 per month if left unmitigated (R-24-791, p. 8). With mitigation
                  conditions imposed, the projected impact was reduced to ~$2.60/month (p. 10).
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Fair context:</span> Approximately 50% of recent bill
                  increases are attributable to higher wholesale gas prices (which any utility would face), ~25% to
                  usage timing (winter consumption), and ~25% to Delta{"'"}s structural procurement premium. This tool
                  shows all three factors.
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Sources:</span>{' '}
                  <a href="https://council.nola.gov/council/media/Assets/Committees/Utility/R-24-791-Gas-Sale.pdf" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    City Council Resolution R-24-791
                  </a>{' · '}
                  <a href="https://council.nola.gov/committees/utility-cable-telecommunications-and-technology/dockets/resolution-and-order-establishing-a-period-of-inte/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    Docket UD-24-01
                  </a>{' · '}
                  <a href="https://fred.stlouisfed.org/series/DHHNGSP" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    FRED Henry Hub prices
                  </a>{' · '}
                  PGA rates derived from actual residential bills (10+ bills, Entergy & Delta eras)
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Water Reliability Tab */}
        <div className={activeTab !== 'water' ? 'hidden' : ''}>
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-cyan-800">
              <span className="font-semibold">Beyond gas costs:</span> New Orleans residents face
              recurring water infrastructure failures. Since 2022, the Sewerage & Water Board has issued
              dozens of boil water advisories due to aging transmission mains breaking — including three
              major 48-inch main breaks in the first 10 weeks of 2026 alone. Below is a tracker of every
              advisory and its estimated economic impact on working families.
            </p>
          </div>
          <section>
            <WaterReliabilityTracker />
          </section>
          <section className="mt-12 mb-12">
            <WaterMethodology />
          </section>
        </div>
      </main>
      </ErrorBoundary>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
          <p>Blackouts, Bills, and Boil Orders (On the Bayou) is an independent, open-source project. Not affiliated with any utility company.</p>
          <p className="mt-1">All data is from public sources or voluntarily contributed bill submissions. Submissions store only ZIP code, usage, and rate data — no names, addresses, or account numbers. <a href="/privacy.html" className="underline hover:text-gray-700">Privacy</a></p>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}

export default App;
