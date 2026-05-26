'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

interface OlaAssetRow { asset_id: string; emotion_tag: string | null; image_url: string }

const POS_KEY = 'ola-chat-mascot-pos';
const HIDDEN_KEY = 'ola-chat-mascot-hidden';
const DEFAULT_ASSET = 'h-09-bubbly-boba-nobg';
const LONG_PRESS_MS = 300;

const DRAG_BUBBLES = [
  '哎呦别拽我啦～',
  '学姐头晕！😵',
  '你要把我放哪儿！',
  '轻点拖～嘻嘻',
];

let hCache: Map<string, string> | null = null;
let hFetchPromise: Promise<void> | null = null;

async function fetchHAssets(): Promise<void> {
  if (hFetchPromise) return hFetchPromise;
  hFetchPromise = (async () => {
    try {
      const { data } = await (supabase
        .from('ola_assets' as 'professors')
        .select('asset_id, emotion_tag, image_url')
        .eq('is_active', true as never)
        .eq('category' as never, 'portrait-transparent' as never));
      hCache = new Map();
      if (data) {
        for (const row of data as unknown as OlaAssetRow[]) {
          hCache.set(`id:${row.asset_id}`, row.image_url);
          if (row.emotion_tag) hCache.set(`emotion:${row.emotion_tag}`, row.image_url);
        }
      }
    } catch { hCache = new Map(); }
  })();
  return hFetchPromise;
}

function getSize() {
  if (typeof window === 'undefined') return 180;
  return window.innerWidth < 1024 ? 120 : 180;
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}

interface Props {
  emotionTag?: string;
  assetId?: string;
  loading?: boolean;
  listenPulse?: number;
}

export function OlaChatMascot({ emotionTag, assetId, loading, listenPulse }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mascotSize, setMascotSize] = useState(180);
  const [pos, _setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [animState, setAnimState] = useState<'idle' | 'listen' | 'speak'>('idle');
  const [dragBubble, setDragBubble] = useState<string | null>(null);

  const dragging = useRef(false);
  const hasDragged = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const setPos = useCallback((v: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    _setPos(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      posRef.current = next;
      return next;
    });
  }, []);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressReady = useRef(false);
  const dragBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = getSize();
    setMascotSize(s);
    setHidden(sessionStorage.getItem(HIDDEN_KEY) === 'true');

    const saved = localStorage.getItem(POS_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - s, p.x)),
          y: Math.max(0, Math.min(window.innerHeight - s - 100, p.y)),
        });
      } catch {
        setPos({ x: window.innerWidth - s - 8, y: window.innerHeight - s - 160 });
      }
    } else {
      setPos({ x: window.innerWidth - s - 8, y: window.innerHeight - s - 160 });
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    fetchHAssets().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !hCache) return;
    let url: string | undefined;
    if (assetId) url = hCache.get(`id:${assetId}`);
    if (!url && emotionTag) url = hCache.get(`emotion:${emotionTag}`);
    if (!url) url = hCache.get(`id:${DEFAULT_ASSET}`);
    setImageUrl(url ?? null);
  }, [ready, emotionTag, assetId]);

  useEffect(() => {
    if (!listenPulse) return;
    setAnimState('listen');
    const t = setTimeout(() => setAnimState(prev => prev === 'listen' ? 'idle' : prev), 500);
    return () => clearTimeout(t);
  }, [listenPulse]);

  useEffect(() => {
    if (loading) {
      setAnimState('speak');
    } else {
      setAnimState(prev => prev === 'speak' ? 'idle' : prev);
    }
  }, [loading]);

  const showDragBubble = useCallback(() => {
    setDragBubble(DRAG_BUBBLES[Math.floor(Math.random() * DRAG_BUBBLES.length)]);
    if (dragBubbleTimer.current) clearTimeout(dragBubbleTimer.current);
    dragBubbleTimer.current = setTimeout(() => setDragBubble(null), 2000);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-close-btn]')) return;
    const currentPos = posRef.current;

    if (isMobile()) {
      longPressReady.current = false;
      hasDragged.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressReady.current = true;
        dragging.current = true;
        dragOffset.current = { x: e.clientX - currentPos.x, y: e.clientY - currentPos.y };
        try { navigator.vibrate?.(50); } catch { /* noop */ }
        showDragBubble();
        if (containerRef.current) containerRef.current.style.transition = 'none';
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }, LONG_PRESS_MS);
    } else {
      dragging.current = true;
      hasDragged.current = false;
      dragOffset.current = { x: e.clientX - currentPos.x, y: e.clientY - currentPos.y };
      if (containerRef.current) containerRef.current.style.transition = 'none';
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, [showDragBubble]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current && !longPressReady.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!dragging.current) return;
    hasDragged.current = true;
    const nx = Math.max(0, Math.min(window.innerWidth - mascotSize, e.clientX - dragOffset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - mascotSize, e.clientY - dragOffset.current.y));
    posRef.current = { x: nx, y: ny };
    if (containerRef.current) {
      containerRef.current.style.left = `${nx}px`;
      containerRef.current.style.top = `${ny}px`;
    }
    if (!dragBubble && Math.random() < 0.02) showDragBubble();
  }, [mascotSize, dragBubble, showDragBubble]);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressReady.current = false;
    if (!dragging.current) return;
    dragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    if (hasDragged.current) {
      const finalPos = posRef.current;
      localStorage.setItem(POS_KEY, JSON.stringify(finalPos));
      setPos(finalPos);
    }
  }, [setPos]);

  const handleClose = useCallback(() => {
    setHidden(true);
    sessionStorage.setItem(HIDDEN_KEY, 'true');
  }, []);

  useEffect(() => {
    return () => {
      if (dragBubbleTimer.current) clearTimeout(dragBubbleTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  if (!initialized || hidden || !imageUrl) return null;

  const isOnLeft = pos.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);

  const animStyle: React.CSSProperties = animState === 'listen'
    ? { animation: 'ola-listen 0.4s ease-in-out' }
    : animState === 'speak'
      ? { animation: 'ola-speak 0.6s ease-in-out infinite' }
      : {};

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ola-listen{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes ola-speak{0%,100%{transform:translateY(0)}25%{transform:translateY(-3px)}75%{transform:translateY(1px)}}
      `}} />
      <div
        ref={containerRef}
        className="fixed z-30 select-none group"
        style={{ left: pos.x, top: pos.y, width: mascotSize, willChange: 'left, top', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {dragBubble && (
          <div className={`absolute bottom-full mb-2 whitespace-nowrap ${isOnLeft ? 'left-0' : 'right-0'}`}>
            <div className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc]">
              {dragBubble}
              <span className={`absolute -bottom-[6px] size-3 rotate-45 bg-white dark:bg-[#1a2332] border-b border-r border-gray-200 dark:border-white/10 ${isOnLeft ? 'left-5' : 'right-5'}`} />
            </div>
          </div>
        )}

        <button
          data-close-btn
          onClick={handleClose}
          className="absolute -top-1 -right-1 z-10 flex items-center justify-center size-6 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-sm opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
          aria-label="隐藏Ola学姐"
        >
          <X className="size-3 text-gray-400" />
        </button>

        <div
          className="cursor-grab active:cursor-grabbing"
          style={{ ...animStyle, opacity: isMobile() ? 0.7 : 0.85 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Ola学姐"
            width={mascotSize}
            className="object-contain object-bottom pointer-events-none drop-shadow-lg"
            draggable={false}
          />
        </div>
      </div>
    </>
  );
}
