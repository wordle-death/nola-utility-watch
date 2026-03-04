import rates from '../data/rates.json';

export default function BillDecomposition({ deltaBill, entergyBill, ccf }) {
  const rows = [
    {
      label: 'Customer Charge',
      description: 'Fixed monthly charge',
      rate: `$${rates.customerCharge.toFixed(2)}/mo`,
      delta: deltaBill.customerCharge,
      entergy: entergyBill.customerCharge,
    },
    {
      label: 'Gas Services',
      description: 'Delivery charge',
      rate: `$${rates.gasServicesPerCCF.toFixed(3)}/CCF`,
      delta: deltaBill.gasServices,
      entergy: entergyBill.gasServices,
    },
    {
      label: 'Formula Rate Plan Rider',
      description: `${(rates.formulaRatePlanRiderPct * 100).toFixed(2)}% of (Customer + Gas Services)`,
      rate: `${(rates.formulaRatePlanRiderPct * 100).toFixed(2)}%`,
      delta: deltaBill.frpRider,
      entergy: entergyBill.frpRider,
    },
    {
      label: 'Purchase Gas Adjustment',
      description: 'Commodity pass-through — THE difference',
      rate: null,
      delta: deltaBill.pga,
      entergy: entergyBill.pga,
      deltaRate: `$${deltaBill.pgaRate.toFixed(5)}/CCF`,
      entergyRate: `$${entergyBill.pgaRate.toFixed(5)}/CCF`,
      highlight: true,
    },
    {
      label: 'Street Use Franchise Fee',
      description: `${(rates.streetUseFranchiseFeePct * 100).toFixed(2)}% of all charges`,
      rate: `${(rates.streetUseFranchiseFeePct * 100).toFixed(2)}%`,
      delta: deltaBill.franchiseFee,
      entergy: entergyBill.franchiseFee,
    },
    {
      label: 'City Tax',
      description: `${(rates.cityTaxPct * 100).toFixed(0)}% of total`,
      rate: `${(rates.cityTaxPct * 100).toFixed(0)}%`,
      delta: deltaBill.cityTax,
      entergy: entergyBill.cityTax,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Line-by-Line Bill Breakdown</h3>
        <p className="text-sm text-gray-500 mt-1">
          Every component is identical except the PGA (highlighted). {ccf} CCF usage.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Line Item</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
              <th className="text-right px-4 py-3 font-medium text-red-600">Delta</th>
              <th className="text-right px-4 py-3 font-medium text-blue-600">Entergy Est.</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const diff = row.delta - row.entergy;
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${row.highlight ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-6 py-3">
                    <p className={`font-medium ${row.highlight ? 'text-amber-800' : 'text-gray-900'}`}>
                      {row.label}
                    </p>
                    <p className="text-xs text-gray-500">{row.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {row.highlight ? (
                      <div>
                        <div className="text-red-600">{row.deltaRate}</div>
                        <div className="text-blue-600">{row.entergyRate}</div>
                      </div>
                    ) : (
                      row.rate
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">
                    ${row.delta.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-700">
                    ${row.entergy.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {Math.abs(diff) < 0.01 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={diff > 0 ? 'text-red-600' : 'text-green-600'}>
                        {diff > 0 ? '+' : ''}${diff.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td className="px-6 py-3 font-bold text-gray-900">TOTAL</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right font-mono font-bold text-red-700">
                ${deltaBill.total.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                ${entergyBill.total.toFixed(2)}
              </td>
              <td className="px-6 py-3 text-right font-mono font-bold text-red-600">
                +${(deltaBill.total - entergyBill.total).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
