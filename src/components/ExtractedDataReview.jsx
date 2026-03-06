import { useState } from 'react';

const MONTH_LABELS = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

/**
 * Batch review of AI-extracted bill data.
 * Shows a compact table of all extracted bills. Each row can be expanded
 * to edit individual fields (in case OCR got something wrong), or removed.
 *
 * Props:
 *  - bills[]: { fileName, data, confidence, error, included }
 *  - zipCode: string
 *  - onConfirm(confirmedBills[]): submit included bills
 *  - onCancel(): go back to upload
 *  - disabled: boolean
 */
export default function ExtractedDataReview({ bills, zipCode, onConfirm, onCancel, disabled }) {
  const [rows, setRows] = useState(() =>
    bills.map((bill, i) => ({
      id: i,
      fileName: bill.fileName,
      error: bill.error,
      confidence: bill.confidence,
      included: bill.included,
      expanded: false,
      fields: bill.data ? {
        provider: bill.data.provider || 'delta',
        bill_month: bill.data.bill_month || '',
        period_start: bill.data.period_start || '',
        period_end: bill.data.period_end || '',
        ccf: bill.data.ccf ?? '',
        pga_rate: bill.data.pga_rate ?? '',
        total_gas_charges: bill.data.total_gas_charges ?? '',
      } : null,
    }))
  );

  function updateRow(id, updates) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function updateField(id, key, value) {
    setRows(prev => prev.map(r =>
      r.id === id ? { ...r, fields: { ...r.fields, [key]: value } } : r
    ));
  }

  function toggleIncluded(id) {
    setRows(prev => prev.map(r =>
      r.id === id && r.fields ? { ...r, included: !r.included } : r
    ));
  }

  function toggleExpanded(id) {
    setRows(prev => prev.map(r =>
      r.id === id ? { ...r, expanded: !r.expanded } : r
    ));
  }

  function handleConfirm() {
    const included = rows
      .filter(r => r.included && r.fields)
      .map(r => ({
        ...r.fields,
        ccf: Math.round(Number(r.fields.ccf)),
        pga_rate: Number(r.fields.pga_rate),
        total_gas_charges: Number(r.fields.total_gas_charges),
        zip_code: zipCode,
      }));

    onConfirm(included);
  }

  function formatMonth(billMonth) {
    if (!billMonth) return '—';
    const parts = billMonth.split('-');
    if (parts.length !== 2) return billMonth;
    return `${MONTH_LABELS[parts[1]] || parts[1]} '${parts[0].slice(2)}`;
  }

  const includedCount = rows.filter(r => r.included).length;
  const successCount = rows.filter(r => r.fields && !r.error).length;
  const errorCount = rows.filter(r => r.error).length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-3">
        {successCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {successCount} extracted successfully
          </span>
        )}
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {errorCount} failed
          </span>
        )}
      </div>

      {/* Privacy notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800">
        Your bill images have already been discarded. Only the numbers below will be saved.
      </div>

      {/* Bill list */}
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.id} className={`border rounded-lg overflow-hidden transition-colors
            ${row.error ? 'border-red-200 bg-red-50' :
              row.included ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>

            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Include checkbox */}
              {row.fields && (
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={() => toggleIncluded(row.id)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{row.fileName}</span>
                  {row.confidence && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                      ${row.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        row.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full
                        ${row.confidence === 'high' ? 'bg-green-500' :
                          row.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {row.confidence}
                    </span>
                  )}
                </div>

                {row.error ? (
                  <p className="text-xs text-red-600 mt-0.5">{row.error}</p>
                ) : row.fields ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.fields.provider === 'entergy' ? 'Entergy' : 'Delta'} &middot;{' '}
                    {formatMonth(row.fields.bill_month)} &middot;{' '}
                    {row.fields.ccf} CCF &middot;{' '}
                    ${Number(row.fields.total_gas_charges).toFixed(2)}
                  </p>
                ) : null}
              </div>

              {/* Expand/collapse button */}
              {row.fields && (
                <button
                  onClick={() => toggleExpanded(row.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  title={row.expanded ? 'Collapse' : 'Edit fields'}
                >
                  <svg className={`w-4 h-4 transition-transform ${row.expanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Expanded edit fields */}
            {row.expanded && row.fields && (
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Provider</label>
                    <select
                      value={row.fields.provider}
                      onChange={e => updateField(row.id, 'provider', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled}
                    >
                      <option value="delta">Delta</option>
                      <option value="entergy">Entergy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Bill Month</label>
                    <input type="month" value={row.fields.bill_month}
                      onChange={e => updateField(row.id, 'bill_month', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">CCF</label>
                    <input type="number" min="1" max="1000" value={row.fields.ccf}
                      onChange={e => updateField(row.id, 'ccf', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">PGA Rate ($/CCF)</label>
                    <input type="number" step="0.00001" min="0" value={row.fields.pga_rate}
                      onChange={e => updateField(row.id, 'pga_rate', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Total Gas ($)</label>
                    <input type="number" step="0.01" min="0" value={row.fields.total_gas_charges}
                      onChange={e => updateField(row.id, 'total_gas_charges', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Period Start</label>
                    <input type="date" value={row.fields.period_start}
                      onChange={e => updateField(row.id, 'period_start', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Period End</label>
                    <input type="date" value={row.fields.period_end}
                      onChange={e => updateField(row.id, 'period_end', e.target.value)}
                      className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={disabled} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ZIP code (read-only, carried from upload step) */}
      <div className="text-sm text-gray-600">
        ZIP code: <span className="font-medium">{zipCode}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={disabled || includedCount === 0}
          className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors
            ${disabled || includedCount === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}`}
        >
          {includedCount === 1
            ? 'Submit 1 bill'
            : `Submit ${includedCount} bills`}
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
