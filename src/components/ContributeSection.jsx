import { useState, useRef } from 'react';
import BillUpload from './BillUpload';
import ExtractedDataReview from './ExtractedDataReview';
import SubmissionSuccess from './SubmissionSuccess';
import { compressForUpload } from '../lib/imageCompress';

/**
 * Orchestrates the full bill contribution flow with batch support:
 *   UPLOAD → EXTRACTING (sequential, with progress) → REVIEW (batch table)
 *   → SUBMITTING → SUCCESS / ERROR
 *
 * Bill images are compressed client-side, sent to /api/extract-bill
 * for AI extraction one at a time (to avoid rate limits), shown to
 * the user for batch confirmation, then submitted to /api/submit-bill.
 *
 * Bill images are never stored — they exist only in memory during extraction.
 */
const STATES = {
  UPLOAD: 'upload',
  EXTRACTING: 'extracting',
  REVIEW: 'review',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function ContributeSection() {
  const [state, setState] = useState(STATES.UPLOAD);
  const [extractedBills, setExtractedBills] = useState([]);
  const [zipCode, setZipCode] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Progress tracking for extraction
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 });

  // Allow cancellation of extraction
  const cancelledRef = useRef(false);

  /**
   * Step 1: User selected file(s) + ZIP code. Compress and extract sequentially.
   */
  async function handleFilesSelected(files, zip) {
    setState(STATES.EXTRACTING);
    setZipCode(zip);
    setError(null);
    setExtractedBills([]);
    cancelledRef.current = false;

    const total = files.length;
    setExtractProgress({ current: 0, total });

    const results = [];

    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) break;

      setExtractProgress({ current: i + 1, total });
      const file = files[i];

      try {
        // Compress the image client-side
        const { base64, mediaType } = await compressForUpload(file);

        // Send to extraction API
        const response = await fetch('/api/extract-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          results.push({
            fileName: file.name,
            error: result.error || 'Failed to analyze bill',
            data: null,
            confidence: null,
            included: false,
          });
        } else {
          results.push({
            fileName: file.name,
            data: result.data,
            confidence: result.data.confidence,
            error: null,
            included: true,
          });
        }
      } catch (err) {
        console.error(`Extraction error for ${file.name}:`, err);
        results.push({
          fileName: file.name,
          error: err.message || 'Failed to analyze bill',
          data: null,
          confidence: null,
          included: false,
        });
      }
    }

    if (cancelledRef.current) {
      handleReset();
      return;
    }

    setExtractedBills(results);

    // If all failed, go to error state
    const successCount = results.filter(r => r.data && !r.error).length;
    if (successCount === 0) {
      setError('Could not extract data from any of the uploaded bills. Please try again with clearer images.');
      setState(STATES.ERROR);
    } else {
      setState(STATES.REVIEW);
    }
  }

  /**
   * Step 2: User confirmed the batch. Submit each included bill for validation + storage.
   */
  async function handleConfirmBatch(confirmedBills) {
    setState(STATES.SUBMITTING);
    setError(null);

    const results = { succeeded: 0, failed: 0, errors: [] };

    for (const bill of confirmedBills) {
      try {
        const response = await fetch('/api/submit-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bill),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          let errMsg = result.message || result.error || 'Submission failed';
          if (result.details) {
            if (Array.isArray(result.details)) {
              errMsg = result.details.join('. ');
            } else if (result.details.message) {
              errMsg = result.details.message;
            }
          }
          results.failed++;
          results.errors.push({ month: bill.bill_month, error: errMsg });
        } else {
          results.succeeded++;
          // Track the latest total_submissions for the success message
          results.totalSubmissions = result.data?.total_submissions;
        }
      } catch (err) {
        console.error('Submission error:', err);
        results.failed++;
        results.errors.push({
          month: bill.bill_month,
          error: err.message || 'Failed to submit',
        });
      }
    }

    setSuccessData(results);
    setState(STATES.SUCCESS);
  }

  /**
   * Cancel ongoing extraction.
   */
  function handleCancelExtraction() {
    cancelledRef.current = true;
  }

  /**
   * Reset to initial state for another submission.
   */
  function handleReset() {
    setState(STATES.UPLOAD);
    setExtractedBills([]);
    setZipCode('');
    setSuccessData(null);
    setError(null);
    setExtractProgress({ current: 0, total: 0 });
    cancelledRef.current = false;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Contribute Your Bills</h2>
        <p className="text-sm text-gray-500 mt-1">
          Help build a community dataset of New Orleans gas bills. Upload photos or PDFs of your
          Delta or Entergy bills — the data is extracted automatically, validated against the known
          rate formula, and stored anonymously. No personal information is ever saved.
        </p>
      </div>

      {/* UPLOAD state */}
      {state === STATES.UPLOAD && (
        <BillUpload onFilesSelected={handleFilesSelected} disabled={false} />
      )}

      {/* EXTRACTING state */}
      {state === STATES.EXTRACTING && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">
              Analyzing bill {extractProgress.current} of {extractProgress.total}...
            </p>
            <p className="text-xs text-gray-500 mt-1">Each bill takes 5-10 seconds</p>
          </div>

          {/* Progress bar */}
          {extractProgress.total > 1 && (
            <div className="w-full max-w-xs">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(extractProgress.current / extractProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">
                {extractProgress.current}/{extractProgress.total} complete
              </p>
            </div>
          )}

          <button
            onClick={handleCancelExtraction}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* REVIEW state */}
      {state === STATES.REVIEW && extractedBills.length > 0 && (
        <ExtractedDataReview
          bills={extractedBills}
          zipCode={zipCode}
          onConfirm={handleConfirmBatch}
          onCancel={handleReset}
          disabled={false}
        />
      )}

      {/* SUBMITTING state */}
      {state === STATES.SUBMITTING && (
        <div className="flex flex-col items-center py-12 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          <p className="text-sm text-gray-600 font-medium">Validating and saving...</p>
        </div>
      )}

      {/* SUCCESS state */}
      {state === STATES.SUCCESS && successData && (
        <SubmissionSuccess
          succeeded={successData.succeeded}
          failed={successData.failed}
          errors={successData.errors}
          totalSubmissions={successData.totalSubmissions}
          onSubmitMore={handleReset}
        />
      )}

      {/* ERROR state */}
      {state === STATES.ERROR && (
        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-800 font-medium">Something went wrong</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
