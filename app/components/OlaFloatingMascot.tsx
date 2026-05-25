'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const SPEECH_BUBBLES = [
  { text: '帮你匹配最合适的澳洲导师 🎯', action: '/koala/chat?mode=path' },
  { text: '写一封打动教授的套磁信 ✉️', action: '/koala/chat?mode=write' },
  { text: '聊聊你的科研方向？🔬', action: '/koala/chat?mode=research' },
  { text: '模拟面试练起来 🎤', action: '/koala/chat?mode=interview' },
  { text: '申请规划不迷路 🧭', action: '/koala/chat?mode=path' },
  { text: '帮你润色 Research Proposal 📝', action: '/koala/chat?mode=rp' },
];

const STORAGE_KEY_POS = 'ola-mascot-pos';
const STORAGE_KEY_HIDDEN = 'ola-mascot-hidden';

const MASCOT_SIZE_MOBILE = 48;
const MASCOT_SIZE_DESKTOP = 64;
const DEFAULT_BOTTOM = 80;
const DEFAULT_RIGHT = 24;

function getMascotSize() {
  if (typeof window === 'undefined') return MASCOT_SIZE_DESKTOP;
  return window.innerWidth < 1024 ? MASCOT_SIZE_MOBILE : MASCOT_SIZE_DESKTOP;
}


export default function OlaFloatingMascot() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [mascotSize, setMascotSize] = useState(MASCOT_SIZE_DESKTOP);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mascotRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  useEffect(() => {
    const size = getMascotSize();
    setMascotSize(size);

    const wasHidden = localStorage.getItem(STORAGE_KEY_HIDDEN) === 'true';
    setHidden(wasHidden);

    const saved = localStorage.getItem(STORAGE_KEY_POS);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPos({ x: p.x, y: p.y });
      } catch {
        setPos({
          x: window.innerWidth - size - DEFAULT_RIGHT,
          y: window.innerHeight - size - DEFAULT_BOTTOM,
        });
      }
    } else {
      setPos({
        x: window.innerWidth - size - DEFAULT_RIGHT,
        y: window.innerHeight - size - DEFAULT_BOTTOM,
      });
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || hidden) return;
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, 300);
    return () => clearTimeout(t);
  }, [initialized, hidden]);

  useEffect(() => {
    if (!entered || hidden) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const runCycle = (delay: number) => {
      const t1 = setTimeout(() => {
        if (cancelled) return;
        setShowBubble(true);
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setShowBubble(false);
          setBubbleIndex(i => (i + 1) % SPEECH_BUBBLES.length);
          runCycle(4000);
        }, 4000);
        timers.push(t2);
      }, delay);
      timers.push(t1);
    };

    runCycle(2000);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [entered, hidden]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-close-btn]')) return;
    dragging.current = true;
    hasDragged.current = false;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasDragged.current = true;
    const nx = Math.max(0, Math.min(window.innerWidth - mascotSize, e.clientX - dragOffset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - mascotSize, e.clientY - dragOffset.current.y));
    setPos({ x: nx, y: ny });
  }, [mascotSize]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (hasDragged.current) {
      setPos(p => {
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(p));
        return p;
      });
    }
  }, []);

  const handleClose = useCallback(() => {
    setHidden(true);
    setVisible(false);
    setEntered(false);
    localStorage.setItem(STORAGE_KEY_HIDDEN, 'true');
  }, []);

  const handleRecall = useCallback(() => {
    setHidden(false);
    localStorage.removeItem(STORAGE_KEY_HIDDEN);
    const size = getMascotSize();
    setPos({
      x: window.innerWidth - size - DEFAULT_RIGHT,
      y: window.innerHeight - size - DEFAULT_BOTTOM,
    });
    localStorage.removeItem(STORAGE_KEY_POS);
    setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, 100);
  }, []);

  const handleBubbleClick = useCallback(() => {
    if (hasDragged.current) return;
    const bubble = SPEECH_BUBBLES[bubbleIndex];
    if (bubble?.action) router.push(bubble.action);
  }, [bubbleIndex, router]);

  const handleMascotClick = useCallback(() => {
    if (hasDragged.current) return;
    router.push('/koala/chat');
  }, [router]);

  if (!initialized) return null;

  if (hidden) {
    return (
      <button
        onClick={handleRecall}
        className="fixed z-50 flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all hover:scale-110"
        style={{ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT }}
        aria-label="召唤 Ola"
      >
        <Image src="/images/ola/ola-welcome.svg" alt="Ola" width={24} height={24} />
      </button>
    );
  }

  if (!visible) return null;

  const isOnLeft = pos.x < window.innerWidth / 2;

  return (
    <div
      ref={mascotRef}
      className={`fixed z-50 select-none touch-none transition-all duration-400 ease-out ${
        entered ? 'translate-x-0 opacity-100' : 'translate-x-[120px] opacity-0'
      }`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Speech bubble */}
      <div
        className={`absolute bottom-[calc(100%+8px)] whitespace-nowrap transition-all duration-300 ${
          isOnLeft ? 'left-0' : 'right-0'
        } ${showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}
      >
        <button
          onClick={handleBubbleClick}
          className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc] hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors cursor-pointer"
        >
          {SPEECH_BUBBLES[bubbleIndex]?.text}
          {/* Triangle */}
          <span
            className={`absolute -bottom-[6px] size-3 rotate-45 bg-white dark:bg-[#1a2332] border-b border-r border-gray-200 dark:border-white/10 ${
              isOnLeft ? 'left-5' : 'right-5'
            }`}
          />
        </button>
      </div>

      {/* Mascot */}
      <div
        className="relative cursor-grab active:cursor-grabbing group"
        style={{ width: mascotSize, height: mascotSize }}
      >
        {/* Close button */}
        <button
          data-close-btn
          onClick={handleClose}
          className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center size-5 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="关闭 Ola"
        >
          <X className="size-3 text-gray-400" />
        </button>

        {/* Ola image with breathing animation */}
        <div
          onClick={handleMascotClick}
          className="size-full rounded-full overflow-hidden bg-white dark:bg-[#1a2332] border-2 border-white dark:border-white/10 shadow-lg animate-[float_3s_ease-in-out_infinite]"
        >
          <Image
            src="/images/ola/ola-welcome.svg"
            alt="Ola"
            width={mascotSize}
            height={mascotSize}
            className="size-full object-cover pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
