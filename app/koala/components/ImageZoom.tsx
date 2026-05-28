'use client';

import { useState, useCallback, useEffect } from 'react';

interface ImageZoomProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
  className?: string;
}

export function ImageZoom({ src, alt = '', children, className }: ImageZoomProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleOpen = useCallback(() => {
    setLoaded(false);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Preload image when modal opens
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setOpen(false);
    img.src = src;
  }, [open, src]);

  return (
    <>
      <button type="button" onClick={handleOpen} className={`cursor-zoom-in ${className ?? ''}`}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          {loaded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="size-10 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
        </div>
      )}
    </>
  );
}
