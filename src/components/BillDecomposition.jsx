import rates from '../data/rates.json';

export default function BillDecomposition({ deltaBill, entergyBill, ccf, flipped = false }) {
  // When flipped (Entergy July), swap which column is "actual" vs "estimated"
  const leftBill = flipped ? entergyBill : deltaBill;
  const rightBill = flipped ? deltaBill : entergyBill;
  const leftLabel = flipped ? 'Entergy' : 'Delta';
  const rightLabel = flipped ? 'Delta' : 'Entergy Est.';
  const leftColor = flipped ? 'text-blue-600' : 'text-red-600';
  const rightColor = flipped ? 'text-red-600' : 'text-blue-600';
  const leftValueColor = flipped ? 'text-blue-700' : 'text-red-700';
  const rightValueColor = flipped ? 'text-red-700' : 'text-blue-700';

  const rows = [
    {
      label: 'Customer Charge',
      description: 'Fixed monthly charge',
      rate: `$${rates.customerCharge.toFixed(2)}/mo`,
      left: leftBill.customerCharge,
      right: rightBill.customerCharge,
    },
    {
      label: 'Gas Services',
      description: 'Delivery charge',
      rate: `$${rates.gasServicesPerCCF.toFixed(3)}/CCF`,
      left: leftBill.gasServices,
      right: rightBill.gasServices,
    },
    {
      label: 'Formula Rate Plan Rider',
      description: `${(rates.formulaRatePlanRiderPct * 100).toFixed(2)}% of (Customer + Gas Services)`,
      rate: `${(rates.formulaRatePlanRiderPct * 100).toFixed(2)}%`,
      left: leftBill.frpRider,
      right: rightBill.frpRider,
    },
    {
      label: 'Purchase Gas Adjustment',
      description: 'Commodity pass-through — THE difference',
      rate: null,
      left: leftBill.pga,
      right: rightBill.pga,
      leftRate: `$${leftBill.pgaRate.toFixed(5)}/CCF`,
      rightRate: `$${rightBill.pgaRate.toFixed(5)}/CCF`,
      highlight: true,
    },
    {
      label: 'Street Use Franchise Fee',
      description: `${(rates.streetUseFranchiseFeePct * 100).toFixed(2)}% of all charges`,
      rate: `${(rates.streetUseFranchiseFeePct * 100).toFixed(2)}%`,
      left: leftBill.franchiseFee,
      right: rightBill.franchiseFee,
    },
    {
      label: 'City Tax',
      description: `${(rates.cityTaxPct * 100).toFixed(0)}% of total`,
      rate: `${(rates.cityTaxPct * 100).toFixed(0)}%`,
      left: leftBill.cityTax,
      right: rightBill.cityTax,
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
              <th className={`text-right px-4 py-3 font-medium ${leftColor}`}>{leftLabel}</th>
              <th className={`text-right px-4 py-3 font-medium ${rightColor}`}>{rightLabel}</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const diff = row.left - row.right;
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
                        <div className={leftColor}>{row.leftRate}</div>
                        <div className={rightColor}>{row.rightRate}</div>
                      </div>
                    ) : (
                      row.rate
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${leftValueColor}`}>
                    ${row.left.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${rightValueColor}`}>
                    ${row.right.toFixed(2)}
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
              <td className={`px-4 py-3 text-right font-mono font-bold ${leftValueColor}`}>
                ${leftBill.total.toFixed(2)}
              </td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${rightValueColor}`}>
                ${rightBill.total.toFixed(2)}
              </td>
              <td className="px-6 py-3 text-right font-mono font-bold">
                {(() => {
                  const totalDiff = leftBill.total - rightBill.total;
                  return Math.abs(totalDiff) < 0.01 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span className={totalDiff > 0 ? 'text-red-600' : 'text-green-600'}>
                      {totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(2)}
                    </span>
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
