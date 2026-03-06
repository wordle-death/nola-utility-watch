/**
 * Success screen after bill(s) are submitted and validated.
 * Handles both single and batch submissions.
 *
 * Props:
 *  - succeeded: number of bills successfully submitted
 *  - failed: number of bills that failed validation
 *  - errors: [{ month, error }] details on failures
 *  - totalSubmissions: latest count from the database
 *  - onSubmitMore: callback to reset and upload more
 */
export default function SubmissionSuccess({ succeeded, failed, errors, totalSubmissions, onSubmitMore }) {
  const total = succeeded + failed;
  const allSucceeded = failed === 0;

  return (
    <div className="text-center space-y-4 py-4">
      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full
        ${allSucceeded ? 'bg-green-100' : 'bg-amber-100'}`}>
        {allSucceeded ? (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900">
          {allSucceeded ? 'Thank you!' : 'Partially submitted'}
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {succeeded === 1 && total === 1
            ? 'Your bill data has been validated and added to the community dataset.'
            : allSucceeded
              ? `All ${succeeded} bills have been validated and added to the community dataset.`
              : `${succeeded} of ${total} bills were successfully submitted.`}
        </p>
      </div>

      {/* Community count */}
      {totalSubmissions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-800">
            The community dataset now has <span className="font-bold">{totalSubmissions}</span> bill{totalSubmissions !== 1 ? 's' : ''}.
            Every bill helps build a stronger case for fair utility rates in New Orleans.
          </p>
        </div>
      )}

      {/* Failed bills detail */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-left">
          <p className="text-sm font-medium text-red-800 mb-1">
            {errors.length} bill{errors.length !== 1 ? 's' : ''} could not be validated:
          </p>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-xs text-red-700">
                <span className="font-medium">{err.month || 'Unknown month'}</span>: {err.error}
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-600 mt-2">
            Try re-uploading these bills with a clearer photo, or edit the extracted data before submitting.
          </p>
        </div>
      )}

      {/* Submit more button */}
      <div className="pt-2">
        <button
          onClick={onSubmitMore}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          Submit more bills
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Only anonymized data (usage, rate, total, ZIP code) was stored. No personal information was collected.
      </p>
    </div>
  );
}
