'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { OlaAvatar } from '../koala/components/ola/OlaAvatar';
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

// Drag interaction bubbles
const DRAG_BUBBLES = [
  '哎呦你要把我放哪儿哦～',
  '慢点移！学姐头晕！😵',
  '别把学姐藏起来！',
  '你是不是想把学姐扔掉😢',
];

// Hover / tap interaction bubbles
const IDLE_INTERACT_BUBBLES = [
  '有什么需要帮忙的吗？😊',
  '点我聊天呀～',
  '学姐在这守着你呢！',
  '想我了？嘻嘻～',
  '别戳了，痒！🤭',
  '你好呀～今天申请顺利吗？',
];

// Tap-to-chat interaction bubbles (click avatar → link to chat)
const TAP_CHAT_BUBBLES: SalesBubble[] = [
  { text: '有什么我能帮你的吗？', action: '/koala/chat' },
  { text: '想找导师吗？点我聊聊~', action: '/koala/chat?mode=path' },
  { text: '学姐在这里哦~', action: '/koala/chat' },
  { text: '需要帮你写套磁信吗？✉️', action: '/koala/chat?mode=write' },
  { text: '有问题随时问学姐~', action: '/koala/chat' },
];

const FAREWELL_TEXT = '学姐先走啦~ 点右下角随时叫我回来哦！';
const RECALL_TEXT = '学姐又回来啦~';

// ─── Constants ───────────────────────────────────────

const STORAGE_KEY_POS = 'ola-mascot-pos';
const STORAGE_KEY_HIDDEN = 'ola-mascot-hidden';
const COOLDOWN_KEY = 'ola-sales-cooldown';
const SESSION_COUNT_KEY = 'ola-sales-session-count';
const MAX_SALES_PER_SESSION = 2;
const COOLDOWN_AFTER_DISMISS = 24 * 60 * 60 * 1000;

const MASCOT_SIZE_MOBILE = 60;
const MASCOT_SIZE_DESKTOP = 80;
const DEFAULT_BOTTOM = 80;
const DEFAULT_RIGHT = 24;
const LONG_PRESS_MS = 300;

function getMascotSize() {
  if (typeof window === 'undefined') return MASCOT_SIZE_DESKTOP;
  return window.innerWidth < 1024 ? MASCOT_SIZE_MOBILE : MASCOT_SIZE_DESKTOP;
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}

function vibrate(pattern: number | number[]) {
  try { navigator?.vibrate?.(pattern); } catch {}
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

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
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
  const [pos, _setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [mascotSize, setMascotSize] = useState(MASCOT_SIZE_DESKTOP);

  // Drag interaction state
  const [dragBubbleText, setDragBubbleText] = useState<string | null>(null);
  // Hover/tap interaction state
  const [interactBubbleText, setInteractBubbleText] = useState<string | null>(null);
  // Tap-to-chat bubble (clickable, links to chat)
  const [tapBubble, setTapBubble] = useState<SalesBubble | null>(null);
  // Bounce animation on tap
  const [bouncing, setBouncing] = useState(false);
  // Farewell bubble before close
  const [farewellVisible, setFarewellVisible] = useState(false);
  // Recall welcome bubble
  const [recallBubble, setRecallBubble] = useState(false);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mascotRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const setPos = useCallback((v: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    _setPos(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      posRef.current = next;
      return next;
    });
  }, []);
  const hasDragged = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressReady = useRef(false);
  const dragBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const farewellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recallBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Mode detection ──────────────────────────────

  const isOnChatPage = pathname?.startsWith('/koala/chat');
  const isExpertPage = isOnChatPage || pathname?.startsWith('/koala/tools');
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
        const maxX = window.innerWidth - size;
        const maxY = window.innerHeight - size;
        setPos({
          x: Math.max(0, Math.min(maxX, p.x)),
          y: Math.max(0, Math.min(maxY, p.y)),
        });
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
    if (!initialized || hidden || isOnChatPage) return;
    setVisible(false);
    setEntered(false);
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, initialDelay);
    return () => clearTimeout(t);
  }, [initialized, hidden, initialDelay, isOnChatPage]);

  // Hide when entering chat page
  useEffect(() => {
    if (isOnChatPage) {
      setVisible(false);
      setEntered(false);
    }
  }, [isOnChatPage]);

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

  const showDragBubble = useCallback(() => {
    setDragBubbleText(pickRandom(DRAG_BUBBLES));
    if (dragBubbleTimer.current) clearTimeout(dragBubbleTimer.current);
    dragBubbleTimer.current = setTimeout(() => setDragBubbleText(null), 2000);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-close-btn]')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const currentPos = posRef.current;

    if (isMobile()) {
      longPressReady.current = false;
      hasDragged.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressReady.current = true;
        dragging.current = true;
        dragOffset.current = {
          x: startX - currentPos.x,
          y: startY - currentPos.y,
        };
        vibrate(30);
        showDragBubble();
        if (mascotRef.current) mascotRef.current.style.transition = 'none';
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }, LONG_PRESS_MS);
    } else {
      dragging.current = true;
      hasDragged.current = false;
      dragOffset.current = {
        x: e.clientX - currentPos.x,
        y: e.clientY - currentPos.y,
      };
      if (mascotRef.current) mascotRef.current.style.transition = 'none';
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
    if (mascotRef.current) {
      mascotRef.current.style.left = `${nx}px`;
      mascotRef.current.style.top = `${ny}px`;
    }

    if (isMobile()) {
      vibrate(30);
    }

    if (!dragBubbleText && Math.random() < 0.02) {
      showDragBubble();
    }
  }, [mascotSize, dragBubbleText, showDragBubble]);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressReady.current = false;

    if (!dragging.current) return;
    dragging.current = false;
    if (mascotRef.current) {
      mascotRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    if (hasDragged.current) {
      const finalPos = posRef.current;
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(finalPos));
      setPos(finalPos);
    }
  }, [setPos]);

  // ─── Hover / tap interaction ─────────────────────

  const showInteractBubble = useCallback(() => {
    if (dragging.current || showBubble || dragBubbleText) return;
    setInteractBubbleText(pickRandom(IDLE_INTERACT_BUBBLES));
    if (interactBubbleTimer.current) clearTimeout(interactBubbleTimer.current);
    interactBubbleTimer.current = setTimeout(() => setInteractBubbleText(null), 2500);
  }, [showBubble, dragBubbleText]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile()) return;
    showInteractBubble();
  }, [showInteractBubble]);

  // ─── Avatar tap/click → bounce + chat bubble ────

  const triggerBounce = useCallback(() => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
  }, []);

  const showTapChatBubble = useCallback(() => {
    const bubble = TAP_CHAT_BUBBLES[Math.floor(Math.random() * TAP_CHAT_BUBBLES.length)];
    setTapBubble(bubble);
    setInteractBubbleText(null);
    setShowBubble(false);
    if (tapBubbleTimer.current) clearTimeout(tapBubbleTimer.current);
    tapBubbleTimer.current = setTimeout(() => setTapBubble(null), 3500);
  }, []);

  const handleTapBubbleClick = useCallback(() => {
    if (tapBubble?.action) router.push(tapBubble.action);
  }, [tapBubble, router]);

  // ─── Close / Recall ──────────────────────────────

  const handleClose = useCallback(() => {
    if (farewellVisible) return;
    vibrate([50, 50, 50]);
    setFarewellVisible(true);
    setShowBubble(false);
    setInteractBubbleText(null);
    setTapBubble(null);
    setDragBubbleText(null);

    farewellTimer.current = setTimeout(() => {
      setFarewellVisible(false);
      setHidden(true);
      setVisible(false);
      setEntered(false);
      localStorage.setItem(STORAGE_KEY_HIDDEN, 'true');
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    }, 1500);
  }, [farewellVisible]);

  const handleRecall = useCallback(() => {
    setHidden(false);
    setRecallBubble(true);
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
    if (recallBubbleTimer.current) clearTimeout(recallBubbleTimer.current);
    recallBubbleTimer.current = setTimeout(() => setRecallBubble(false), 3000);
  }, []);

  // ─── Click handlers ──────────────────────────────

  const handleBubbleClick = useCallback(() => {
    if (hasDragged.current) return;
    const bubble = activeBubbles[bubbleIndex];
    if (bubble?.action) router.push(bubble.action);
  }, [bubbleIndex, router, activeBubbles]);

  const handleMascotClick = useCallback(() => {
    if (hasDragged.current) return;
    vibrate(50);
    triggerBounce();
    showTapChatBubble();
  }, [triggerBounce, showTapChatBubble]);

  // ─── Cleanup timers ──────────────────────────────

  useEffect(() => {
    return () => {
      if (dragBubbleTimer.current) clearTimeout(dragBubbleTimer.current);
      if (interactBubbleTimer.current) clearTimeout(interactBubbleTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (tapBubbleTimer.current) clearTimeout(tapBubbleTimer.current);
      if (farewellTimer.current) clearTimeout(farewellTimer.current);
      if (recallBubbleTimer.current) clearTimeout(recallBubbleTimer.current);
    };
  }, []);

  // ─── Render ──────────────────────────────────────

  if (!initialized) return null;

  // Hide on chat page
  if (isOnChatPage) return null;

  if (hidden) {
    return (
      <div className="fixed z-50 group" style={{ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT }}>
        <button
          onClick={handleRecall}
          className="relative flex items-center justify-center size-11 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all hover:scale-110 animate-[breathe_2.5s_ease-in-out_infinite]"
          aria-label="叫学姐回来"
        >
          <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" className="size-7" />
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-gray-800 dark:bg-[#1a2332] text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-gray-700 dark:border-white/10">
          叫学姐回来
          <span className="absolute -bottom-1 right-4 size-2 rotate-45 bg-gray-800 dark:bg-[#1a2332] border-b border-r border-gray-700 dark:border-white/10" />
        </div>
      </div>
    );
  }

  if (!visible) return null;

  const isOnLeft = pos.x < window.innerWidth / 2;
  const currentBubble = activeBubbles[bubbleIndex];

  // Priority: farewell > recall > tap-chat > drag > interact > sales
  const activeBubbleText = dragBubbleText ?? interactBubbleText;
  const showSalesBubble = !activeBubbleText && !tapBubble && !farewellVisible && !recallBubble && showBubble && hasBubbles && currentBubble;
  const showAnyBubble = farewellVisible || recallBubble || !!tapBubble || !!activeBubbleText || showSalesBubble;

  const bubbleArrow = (
    <span
      className={`absolute -bottom-[6px] size-3 rotate-45 bg-white dark:bg-[#1a2332] border-b border-r border-gray-200 dark:border-white/10 ${
        isOnLeft ? 'left-5' : 'right-5'
      }`}
    />
  );

  return (
    <>
      {/* Keyframe styles for bounce + breathe */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes olaBounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      ` }} />

      <div
        ref={mascotRef}
        className={`fixed z-50 select-none transition-all duration-400 ease-out ${
          entered ? 'translate-x-0 opacity-100' : 'translate-x-[120px] opacity-0'
        }`}
        style={{ left: pos.x, top: pos.y, willChange: 'left, top', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Speech bubble layer */}
        {showAnyBubble && (
          <div
            className={`absolute bottom-[calc(100%+8px)] whitespace-nowrap transition-all duration-300 ${
              isOnLeft ? 'left-0' : 'right-0'
            } opacity-100 translate-y-0`}
          >
            {farewellVisible ? (
              <div className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc]">
                {FAREWELL_TEXT}
                {bubbleArrow}
              </div>
            ) : recallBubble ? (
              <div className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc]">
                {RECALL_TEXT}
                {bubbleArrow}
              </div>
            ) : tapBubble ? (
              <button
                onClick={handleTapBubbleClick}
                className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc] hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors cursor-pointer"
              >
                {tapBubble.text}
                {bubbleArrow}
              </button>
            ) : activeBubbleText ? (
              <div className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc]">
                {activeBubbleText}
                {bubbleArrow}
              </div>
            ) : showSalesBubble && currentBubble ? (
              <button
                onClick={handleBubbleClick}
                className="relative px-3 py-2 rounded-xl bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md text-xs text-gray-700 dark:text-[#e8e4dc] hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors cursor-pointer"
              >
                {currentBubble.text}
                {bubbleArrow}
              </button>
            ) : null}
          </div>
        )}

        {/* Mascot */}
        <div
          className="relative cursor-grab active:cursor-grabbing group"
          style={{ width: mascotSize, height: mascotSize }}
          onMouseEnter={handleMouseEnter}
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

          {/* Ola image with float/bounce animation */}
          <div
            onClick={handleMascotClick}
            className={`size-full shadow-lg ${
              dragging.current ? '' : 'animate-[float_3s_ease-in-out_infinite]'
            }`}
            style={bouncing ? { animation: 'olaBounce 300ms ease-out' } : undefined}
          >
            <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="md" className="size-full pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  );
}
