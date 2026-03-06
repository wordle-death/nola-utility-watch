import { useState, useRef } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const NOLA_ZIPS = [
  '70112', '70113', '70114', '70115', '70116', '70117', '70118', '70119',
  '70121', '70122', '70123', '70124', '70125', '70126', '70127', '70128',
  '70129', '70130', '70131',
];

/**
 * Drag-and-drop + file picker for bill uploads (supports multiple files), plus ZIP code selector.
 * Calls onFilesSelected(files[], zip) when the user is ready to analyze.
 */
export default function BillUpload({ onFilesSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function validateFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" — unsupported file type. Please use JPEG, PNG, or PDF.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`;
    }
    return null;
  }

  function addFiles(fileList) {
    setError(null);
    const newFiles = Array.from(fileList);
    const errors = [];

    const valid = newFiles.filter(file => {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
    }

    if (valid.length > 0) {
      setSelectedFiles(prev => {
        // Avoid duplicates by name+size
        const existing = new Set(prev.map(f => `${f.name}-${f.size}`));
        const unique = valid.filter(f => !existing.has(`${f.name}-${f.size}`));
        return [...prev, ...unique];
      });
    }
  }

  function removeFile(index) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleInputChange(e) {
    if (e.target.files?.length) {
      addFiles(e.target.files);
    }
    // Reset input so the same file(s) can be selected again
    e.target.value = '';
  }

  function handleSubmit() {
    if (!selectedFiles.length || !zipCode) return;
    onFilesSelected(selectedFiles, zipCode);
  }

  const isReady = selectedFiles.length > 0 && zipCode && !disabled;
  const plural = selectedFiles.length !== 1;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="space-y-2">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4h32zM28 8l12 12m-12-12v12h12" />
          </svg>
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Upload one or multiple bills &middot; JPEG, PNG, PDF up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Selected file list */}
      {selectedFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">
            {selectedFiles.length} bill{plural ? 's' : ''} selected
          </p>
          {selectedFiles.map((file, i) => (
            <div key={`${file.name}-${file.size}-${i}`}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 text-xs">
                  {file.type === 'application/pdf' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-gray-800 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ZIP code selector */}
      <div>
        <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700 mb-1">
          Your New Orleans ZIP code
        </label>
        <select
          id="zip-code"
          value={zipCode}
          onChange={e => setZipCode(e.target.value)}
          className="block w-full sm:w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={disabled}
        >
          <option value="">Select ZIP code</option>
          {NOLA_ZIPS.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!isReady}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm transition-colors
          ${isReady
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
      >
        {selectedFiles.length > 1
          ? `Analyze ${selectedFiles.length} Bills`
          : 'Analyze My Bill'}
      </button>

      {/* Privacy note */}
      <p className="text-xs text-gray-500">
        Your bill images are analyzed in real-time and <span className="font-medium">never stored</span>.
        Only the anonymized numbers (usage, rate, total, ZIP code) are saved — no names, addresses, or account numbers.
      </p>
    </div>
  );
}
