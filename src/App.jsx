import BillCalculator from './components/BillCalculator';
import CumulativeSavings from './components/CumulativeSavings';
import PGATrendChart from './components/PGATrendChart';

function App() {
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Context banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">What happened:</span> In July 2025, Delta Utilities acquired Entergy's gas
            distribution business in New Orleans. Every rate component is identical — except the Purchase Gas Adjustment (PGA),
            the commodity pass-through. Entergy had a hedging program that kept costs stable. Delta does not.
            Enter your usage below to see exactly what that means for your bill.
          </p>
        </div>

        {/* Gas Cost Calculator */}
        <section className="mb-12">
          <BillCalculator />
        </section>

        {/* Cumulative Savings */}
        <section className="mb-12">
          <CumulativeSavings />
        </section>

        {/* PGA Trend Chart */}
        <section className="mb-12">
          <PGATrendChart />
        </section>

        {/* About / Methodology */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Tool</h3>
            <div className="prose prose-sm text-gray-600 space-y-3">
              <p>
                NOLA Utility Watch is a free, open-source project providing independent analysis of utility costs
                in New Orleans. This calculator is based on actual bill data from a New Orleans residential customer
                (same address and meter number across both Entergy and Delta service periods).
              </p>
              <p>
                <span className="font-semibold text-gray-700">The analytical basis:</span> Independent bill analysis
                confirmed that every rate component — customer charge ($12.32/mo), gas services ($0.266/CCF),
                Formula Rate Plan Rider (77.47%), franchise fee (5.27%), and city tax (3%) — is identical between
                Entergy and Delta. The sole variable is the PGA.
              </p>
              <p>
                <span className="font-semibold text-gray-700">Fair context:</span> Approximately 50% of recent bill
                increases are attributable to higher wholesale gas prices (which any utility would face), ~25% to
                usage timing (winter consumption), and ~25% to Delta's structural procurement premium. This tool
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
      </main>

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
