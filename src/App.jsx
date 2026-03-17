import { Component, useState } from 'react';
import BillCalculator from './components/BillCalculator';
import CumulativeSavings from './components/CumulativeSavings';
import PGATrendChart from './components/PGATrendChart';
import WaterReliabilityTracker from './components/WaterReliabilityTracker';
import ContributeSection from './components/ContributeSection';
import CommunityStats from './components/CommunityStats';
import TabNav from './components/TabNav';
import WaterMethodology from './components/WaterMethodology';

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
  { id: 'gas', label: 'Gas Costs' },
  { id: 'water', label: 'Water Reliability' },
];

function App() {
  const [activeTab, setActiveTab] = useState('gas');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                NOLA Utility Watch
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
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <ErrorBoundary>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Gas Costs Tab */}
        <div className={activeTab !== 'gas' ? 'hidden' : ''}>
          {/* Context banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">What happened:</span> In July 2025, Delta Utilities acquired Entergy{"'"}s gas
              distribution business in New Orleans. Every rate component is identical — except the Purchase Gas Adjustment (PGA),
              the commodity pass-through. Entergy had a hedging program that kept costs stable. Delta does not.
              Enter your usage below to see exactly what that means for your bill.
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
                  NOLA Utility Watch is a free, open-source project providing independent analysis of utility costs
                  in New Orleans. This calculator is based on actual bill data from a New Orleans residential customer
                  (same address and meter number across both Entergy and Delta service periods).
                </p>
                <p>
                  <span className="font-semibold text-gray-700">The analytical basis:</span> Independent bill analysis
                  of 10+ actual bills confirmed that every rate component — customer charge ($12.32/mo), gas services ($0.266/CCF),
                  Formula Rate Plan Rider (77.47%), franchise fee (5.27%), and city tax (3%) — is identical between
                  Entergy and Delta. The sole variable is the PGA (Purchase Gas Adjustment).
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Fair context:</span> Approximately 50% of recent bill
                  increases are attributable to higher wholesale gas prices (which any utility would face), ~25% to
                  usage timing (winter consumption), and ~25% to Delta{"'"}s structural procurement premium. This tool
                  shows all three factors.
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Sources:</span>{' '}
                  <a href="https://fred.stlouisfed.org/series/DHHNGSP" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    FRED Henry Hub prices
                  </a>{' · '}
                  <a href="https://council.nola.gov/committees/utility-cable-telecommunications-and-technology/dockets/resolution-and-order-establishing-a-period-of-inte/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    City Council Docket UD-24-01
                  </a>{' · '}
                  Actual residential bills (10 bills, Entergy & Delta eras)
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
          <p>NOLA Utility Watch is an independent, open-source project. Not affiliated with any utility company.</p>
          <p className="mt-1">All data is from public sources or voluntarily contributed bill data. No personal information is collected.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
