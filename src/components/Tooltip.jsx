import { useState } from 'react';

export default function Tooltip({ term, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="border-b border-dotted border-gray-400 cursor-help text-inherit font-inherit"
      >
        {term}
      </button>
      {open && (
        <span className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}
