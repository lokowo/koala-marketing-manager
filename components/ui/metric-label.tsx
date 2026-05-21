'use client';

import { useState, useRef, useEffect } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';

interface MetricLabelProps {
  label: string;
  tooltip: string;
}

export function MetricLabel({ label, tooltip }: MetricLabelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
      {label}
      <span className="relative" ref={ref}>
        <button
          type="button"
          className="inline-flex items-center text-gray-400 hover:text-blue-600 transition-colors duration-150 cursor-help"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((v) => !v)}
          aria-label={`${label} 说明`}
        >
          <IconInfoCircle size={14} stroke={1.5} />
        </button>
        {open && (
          <div
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-600 shadow-md z-50"
          >
            {tooltip}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-200" />
          </div>
        )}
      </span>
    </span>
  );
}
