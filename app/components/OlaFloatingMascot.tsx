'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '../koala/components/AuthContext';

// ─── Bubble definitions ─────────────────────────────

interface SalesBubble {
  text: string;
  action: string;
}

const SALES_ANON: SalesBubble[] = [
  { text: '我帮 200+ 学生匹配到了心仪导师 🎯', action: '/koala/chat?mode=path' },
  { text: '30 秒注册，送你 30 积分 🎁', action: '/koala/auth?mode=register' },
  { text: '你的背景能申到哪些澳洲教授？试试看 →', action: '/koala/chat?mode=path' },
  { text: '免费帮你分析匹配度，不满意不收费 ✨', action: '/koala/chat?mode=path' },
];

const SALES_FREE: SalesBubble[] = [
  { text: '你上次看的教授有新 funding 了！想了解吗？💰', action: '/koala/chat?mode=path' },
  { text: '我能帮你写一封定制套磁信 ✉️', action: '/koala/chat?mode=write' },
  { text: '想看看你的完整匹配报告吗？📊', action: '/koala/chat?mode=path' },
  { text: '今天的免费匹配次数还有哦，用完就没了 →', action: '/koala/chat?mode=path' },
];

const SALES_PAID: SalesBubble[] = [
  { text: '需要我帮你做什么？🎯', action: '/koala/chat' },
  { text: '有新教授入库了，要看看吗？', action: '/koala/professors' },
  { text: '要不要更新一下你的匹配画像？📝', action: '/koala/chat?mode=path' },
];

const PROF_ANON: SalesBubble[] = [
  { text: '想知道你和这位教授的匹配度吗？🎯', action: '/koala/chat?mode=path' },
  { text: '我能帮你写一封打动这位教授的信 ✉️', action: '/koala/chat?mode=write' },
  { text: '注册后查看教授完整联系方式 →', action: '/koala/auth?mode=register' },
];

const PROF_FREE: SalesBubble[] = [
  { text: '要我帮你分析这位教授的研究方向吗？🔬', action: '/koala/chat?mode=research' },
  { text: '我来帮你写一封针对性的套磁信 ✉️', action: '/koala/chat?mode=write' },
  { text: '这位教授的学生反馈我帮你查查？', action: '/koala/chat?mode=path' },
];

// ─── Constants ───────────────────────────────────────

const STORAGE_KEY_POS = 'ola-mascot-pos';
const STORAGE_KEY_HIDDEN = 'ola-mascot-hidden';
const COOLDOWN_KEY = 'ola-sales-cooldown';
const SESSION_COUNT_KEY = 'ola-sales-session-count';
const MAX_SALES_PER_SESSION = 2;
const COOLDOWN_AFTER_DISMISS = 24 * 60 * 60 * 1000;

const MASCOT_SIZE_MOBILE = 48;
const MASCOT_SIZE_DESKTOP = 64;
const DEFAULT_BOTTOM = 80;
const DEFAULT_RIGHT = 24;

function getMascotSize() {
  if (typeof window === 'undefined') return MASCOT_SIZE_DESKTOP;
  return window.innerWidth < 1024 ? MASCOT_SIZE_MOBILE : MASCOT_SIZE_DESKTOP;
}

function isInCooldown(): boolean {
  if (typeof window === 'undefined') return false;
  const lastDismiss = localStorage.getItem(COOLDOWN_KEY);
  if (lastDismiss && Date.now() - parseInt(lastDismiss) < COOLDOWN_AFTER_DISMISS) return true;
  const count = parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) || '0');
  return count >= MAX_SALES_PER_SESSION;
}

function incrementSessionCount() {
  const count = parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) || '0');
  sessionStorage.setItem(SESSION_COUNT_KEY, String(count + 1));
}

// ─── Component ───────────────────────────────────────

export default function OlaFloatingMascot() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();

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

  // ─── Mode detection ──────────────────────────────

  const isExpertPage = pathname?.startsWith('/koala/chat') || pathname?.startsWith('/koala/tools');
  const isSalesMode = !isExpertPage;
  const isProfessorPage = pathname?.startsWith('/professor/') || pathname?.startsWith('/koala/professors/');

  const isPaid = profile && profile.plan_type !== 'free';
  const isLoggedIn = !!user;

  const activeBubbles = useMemo((): SalesBubble[] => {
    if (isExpertPage) return [];

    if (isProfessorPage) {
      if (!isLoggedIn) return PROF_ANON;
      if (!isPaid) return PROF_FREE;
      return SALES_PAID;
    }

    if (!isLoggedIn) return SALES_ANON;
    if (!isPaid) return SALES_FREE;
    return SALES_PAID;
  }, [isExpertPage, isProfessorPage, isLoggedIn, isPaid]);

  const hasBubbles = activeBubbles.length > 0;

  // ─── Timing params ───────────────────────────────

  const initialDelay = isSalesMode
    ? (isProfessorPage ? 15000 : 8000)
    : 300;

  const bubbleStayTime = isSalesMode ? 6000 : 4000;
  const bubbleGapTime = isSalesMode ? 5000 : 4000;

  // ─── Init position ───────────────────────────────

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

  // ─── Appearance with mode-aware delay ────────────

  useEffect(() => {
    if (!initialized || hidden) return;
    setVisible(false);
    setEntered(false);
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, initialDelay);
    return () => clearTimeout(t);
    // re-run when page mode changes
  }, [initialized, hidden, initialDelay]);

  // ─── Bubble cycling ──────────────────────────────

  useEffect(() => {
    if (!entered || hidden || !hasBubbles) return;

    if (isSalesMode && isInCooldown()) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const runCycle = (delay: number) => {
      const t1 = setTimeout(() => {
        if (cancelled) return;
        setShowBubble(true);
        if (isSalesMode) incrementSessionCount();
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setShowBubble(false);
          setBubbleIndex(i => (i + 1) % activeBubbles.length);
          if (isSalesMode && isInCooldown()) return;
          runCycle(bubbleGapTime);
        }, bubbleStayTime);
        timers.push(t2);
      }, delay);
      timers.push(t1);
    };

    runCycle(2000);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [entered, hidden, hasBubbles, activeBubbles.length, isSalesMode, bubbleStayTime, bubbleGapTime]);

  // Reset bubble index when page changes
  useEffect(() => {
    setBubbleIndex(0);
    setShowBubble(false);
  }, [pathname]);

  // ─── Drag handlers ──────────────────────────────

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

  // ─── Close / Recall ──────────────────────────────

  const handleClose = useCallback(() => {
    setHidden(true);
    setVisible(false);
    setEntered(false);
    localStorage.setItem(STORAGE_KEY_HIDDEN, 'true');
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
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

  // ─── Click handlers ──────────────────────────────

  const handleBubbleClick = useCallback(() => {
    if (hasDragged.current) return;
    const bubble = activeBubbles[bubbleIndex];
    if (bubble?.action) router.push(bubble.action);
  }, [bubbleIndex, router, activeBubbles]);

  const handleMascotClick = useCallback(() => {
    if (hasDragged.current) return;
    router.push('/koala/chat');
  }, [router]);

  // ─── Render ──────────────────────────────────────

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
  const currentBubble = activeBubbles[bubbleIndex];

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
      {hasBubbles && currentBubble && (
        <div
          className={`absolute bottom-[calc(100%+8px)] whitespace-nowrap transition-all duration-300 ${
            isOnLeft ? 'left-0' : 'right-0'
          } ${showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}
        >
          <button
            onClick={handleBubbleClick}
            className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc] hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors cursor-pointer"
          >
            {currentBubble.text}
            <span
              className={`absolute -bottom-[6px] size-3 rotate-45 bg-white dark:bg-[#1a2332] border-b border-r border-gray-200 dark:border-white/10 ${
                isOnLeft ? 'left-5' : 'right-5'
              }`}
            />
          </button>
        </div>
      )}

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
