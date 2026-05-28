'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { OlaAvatar, getAssetMeta, ensureAssetsLoaded } from '../koala/components/ola/OlaAvatar';
import type { OlaAssetMeta } from '../koala/components/ola/OlaAvatar';
import { Volume2, VolumeOff } from 'lucide-react';
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

const RECALL_TEXT = '学姐又回来啦~';

// ─── Constants ───────────────────────────────────────

const STORAGE_KEY_POS = 'ola-mascot-pos';
const COOLDOWN_KEY = 'ola-sales-cooldown';
const SESSION_COUNT_KEY = 'ola-sales-session-count';
const MAX_SALES_PER_SESSION = 2;
const COOLDOWN_AFTER_DISMISS = 24 * 60 * 60 * 1000;

const MASCOT_SIZE_MOBILE = 150;
const MASCOT_SIZE_DESKTOP = 200;
const MASCOT_SIZE_MOBILE_FULL = 280;
const MASCOT_SIZE_DESKTOP_FULL = 350;

function isFullBody(assetId: string): boolean {
  return assetId.startsWith('b-') || assetId.startsWith('c-');
}
const DEFAULT_BOTTOM = 100;
const DEFAULT_RIGHT = 12;
const LONG_PRESS_MS = 300;
const EMOTION_STORAGE_KEY = 'ola-latest-emotion';
const IDLE_ROTATE_INTERVAL = 15000;

interface EmotionAsset {
  assetId: string;
  caption: string;
}

const EMOTION_ASSET_MAP: Record<string, EmotionAsset> = {
  neutral:  { assetId: 'h-02-morning-coffee-nobg', caption: '' },
  happy:    { assetId: 'h-03-encouragement-nobg', caption: '今天心情不错嘛～' },
  excited:  { assetId: 'h-08-nerd-excited-nobg', caption: '太棒了吧！！' },
  academic: { assetId: 'h-04-late-study-nobg', caption: '让我想想...' },
  strict:   { assetId: 'h-07-queen-mode-nobg', caption: '学姐要认真了' },
  sleepy:   { assetId: 'h-06-goodnight-nobg', caption: '困了...早点休息' },
  drunk:    { assetId: 'b-07-nightclub', caption: '嗨起来！' },
  sad:      { assetId: 'h-01-night-listen-nobg', caption: '学姐在呢，别难过' },
  angry:    { assetId: 'b-06-punching', caption: '谁欺负你了？！' },
  charming: { assetId: 'c-03-ol-looking-back', caption: '嘻嘻～' },
  powerful: { assetId: 'c-04-boss-trenchcoat', caption: '学姐帮你撑腰' },
  cute:     { assetId: 'c-07-koala-hoodie-cute', caption: '别走嘛～' },
  festive:  { assetId: 'c-10-cny-qipao', caption: '节日快乐！' },
};

const IDLE_CAPTIONS = [
  '今天也要加油鸭～',
  '学姐在这守着你呢',
  '有问题随时问我哦',
  '休息一下也很重要！',
  '你已经很棒啦～',
];

const IDLE_ASSETS = [
  'h-09-bubbly-boba-nobg',
  'h-03-encouragement-nobg',
  'h-04-late-study-nobg',
  'h-07-streetwear-cool-nobg',
];

function getMascotSize(full = false) {
  if (typeof window === 'undefined') return full ? MASCOT_SIZE_DESKTOP_FULL : MASCOT_SIZE_DESKTOP;
  const mobile = window.innerWidth < 1024;
  if (full) return mobile ? MASCOT_SIZE_MOBILE_FULL : MASCOT_SIZE_DESKTOP_FULL;
  return mobile ? MASCOT_SIZE_MOBILE : MASCOT_SIZE_DESKTOP;
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
  const [baseMascotSize, setBaseMascotSize] = useState(MASCOT_SIZE_DESKTOP);

  // Drag interaction state
  const [dragBubbleText, setDragBubbleText] = useState<string | null>(null);
  // Hover/tap interaction state
  const [interactBubbleText, setInteractBubbleText] = useState<string | null>(null);
  // Tap-to-chat bubble (clickable, links to chat)
  const [tapBubble, setTapBubble] = useState<SalesBubble | null>(null);
  // Bounce animation on tap
  const [bouncing, setBouncing] = useState(false);
  // Recall welcome bubble
  const [recallBubble, setRecallBubble] = useState(false);
  // Dynamic emotion-based mascot
  const [currentAssetId, setCurrentAssetId] = useState('h-09-bubbly-boba-nobg');
  const mascotSize = isFullBody(currentAssetId)
    ? (baseMascotSize === MASCOT_SIZE_MOBILE ? MASCOT_SIZE_MOBILE_FULL : MASCOT_SIZE_DESKTOP_FULL)
    : baseMascotSize;
  const [currentCaption, setCurrentCaption] = useState('');
  const [assetOpacity, setAssetOpacity] = useState(1);
  const idleRotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEmotionRef = useRef<string | null>(null);
  // Video playback state
  const [currentMeta, setCurrentMeta] = useState<OlaAssetMeta | null>(null);
  const [muted, setMuted] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    setBaseMascotSize(size);

    // Clean up legacy localStorage hidden key
    localStorage.removeItem('ola-mascot-hidden');

    const estHeight = size * 1.5;
    const saved = localStorage.getItem(STORAGE_KEY_POS);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const maxX = window.innerWidth - size;
        const maxY = window.innerHeight - estHeight;
        setPos({
          x: Math.max(0, Math.min(maxX, p.x)),
          y: Math.max(0, Math.min(maxY, p.y)),
        });
      } catch {
        setPos({
          x: window.innerWidth - size - DEFAULT_RIGHT,
          y: window.innerHeight - estHeight - DEFAULT_BOTTOM,
        });
      }
    } else {
      setPos({
        x: window.innerWidth - size - DEFAULT_RIGHT,
        y: window.innerHeight - estHeight - DEFAULT_BOTTOM,
      });
    }
    setInitialized(true);
  }, []);

  // ─── Re-clamp position when mascot size changes ──
  useEffect(() => {
    if (!initialized) return;
    setPos(prev => ({
      x: Math.max(0, Math.min(window.innerWidth - mascotSize, prev.x)),
      y: Math.max(0, Math.min(window.innerHeight - mascotSize * 1.5, prev.y)),
    }));
  }, [mascotSize, initialized, setPos]);

  // ─── Appearance with mode-aware delay ────────────

  useEffect(() => {
    if (!initialized || hidden) return;
    setVisible(false);
    setEntered(false);
    // Chat page: show immediately; other pages: use delay
    const delay = isOnChatPage ? 100 : initialDelay;
    const t = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, delay);
    return () => clearTimeout(t);
  }, [initialized, hidden, initialDelay, isOnChatPage]);

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

  // ─── Temporary show for animation playback ──────
  const tempShow = useCallback(() => {
    if (!hidden) return;
    setHidden(false);
    const size = getMascotSize();
    setPos({
      x: window.innerWidth - size - DEFAULT_RIGHT,
      y: window.innerHeight - size * 1.5 - DEFAULT_BOTTOM,
    });
    setVisible(true);
    setTimeout(() => setEntered(true), 50);
  }, [hidden, setPos]);

  // ─── Load asset metadata cache ───────────────────
  useEffect(() => {
    ensureAssetsLoaded().then(() => setAssetsReady(true));
  }, []);

  // ─── Emotion-based asset switching ───────────────
  const switchAsset = useCallback((assetId: string, caption: string) => {
    setAssetOpacity(0);
    setTimeout(() => {
      setCurrentAssetId(assetId);
      setCurrentCaption(caption);
      setCurrentMeta(assetsReady ? getAssetMeta(assetId) ?? null : null);
      setVideoError(false);
      setAssetOpacity(1);
    }, 300);
  }, [assetsReady]);

  // Resolve meta whenever assetId or assetsReady changes
  useEffect(() => {
    if (assetsReady) {
      const meta = getAssetMeta(currentAssetId) ?? null;
      setCurrentMeta(meta);
      console.log('[OlaMascot] asset:', currentAssetId, '| image:', meta?.image_url ?? 'none', '| video:', meta?.video_url ?? 'none');
    }
  }, [assetsReady, currentAssetId]);

  const handleVideoEnded = useCallback(() => {
    const mode = currentMeta?.play_mode;

    if (mode === 'emotion' || mode === 'action') {
      setAssetOpacity(0);
      setTimeout(() => {
        switchAsset('h-09-bubbly-boba-nobg', pickRandom(IDLE_CAPTIONS));
      }, 300);
    }
  }, [currentMeta, switchAsset]);

  const toggleMuted = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      if (audioRef.current) {
        audioRef.current.muted = next;
        if (!next && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Sync audio element with video playback
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;
    audio.muted = muted;
    const syncPlay = () => { audio.currentTime = video.currentTime; audio.play().catch(() => {}); };
    const syncPause = () => { audio.pause(); };
    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPause);
    video.addEventListener('ended', syncPause);
    return () => {
      video.removeEventListener('play', syncPlay);
      video.removeEventListener('pause', syncPause);
      video.removeEventListener('ended', syncPause);
    };
  }, [currentMeta?.video_url, muted]);

  // Poll localStorage for emotion changes from chat page
  useEffect(() => {
    if (!initialized) return;

    const checkEmotion = () => {
      const emotion = localStorage.getItem(EMOTION_STORAGE_KEY);
      if (emotion && emotion !== lastEmotionRef.current) {
        lastEmotionRef.current = emotion;
        const mapped = EMOTION_ASSET_MAP[emotion];
        if (!mapped) return;

        const meta = assetsReady ? getAssetMeta(mapped.assetId) : null;
        const isActionOrEmotion = meta?.video_url && (meta.play_mode === 'action' || meta.play_mode === 'emotion');

        // If hidden and not action/emotion, skip
        if (hidden && !isActionOrEmotion) return;

        // Temporarily show mascot for action/emotion even when hidden
        if (hidden && isActionOrEmotion) {
          tempShow();
        }

        const caption = mapped.caption || IDLE_CAPTIONS[Math.floor(Math.random() * IDLE_CAPTIONS.length)];
        switchAsset(mapped.assetId, caption);
      }
    };

    checkEmotion();
    const interval = setInterval(checkEmotion, 2000);
    return () => clearInterval(interval);
  }, [initialized, hidden, assetsReady, switchAsset, tempShow]);

  // Idle rotation every 15 seconds when no recent emotion
  useEffect(() => {
    if (!entered || hidden || isOnChatPage) return;

    idleRotateTimer.current = setInterval(() => {
      const emotion = localStorage.getItem(EMOTION_STORAGE_KEY);
      if (emotion && emotion !== 'neutral') return;

      const randomAsset = IDLE_ASSETS[Math.floor(Math.random() * IDLE_ASSETS.length)];
      const randomCaption = IDLE_CAPTIONS[Math.floor(Math.random() * IDLE_CAPTIONS.length)];
      switchAsset(randomAsset, randomCaption);
    }, IDLE_ROTATE_INTERVAL);

    return () => {
      if (idleRotateTimer.current) clearInterval(idleRotateTimer.current);
    };
  }, [entered, hidden, isOnChatPage, switchAsset]);

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
    const estimatedHeight = mascotSize * 1.5;
    const nx = Math.max(0, Math.min(window.innerWidth - mascotSize, e.clientX - dragOffset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - estimatedHeight, e.clientY - dragOffset.current.y));
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

  // ─── Close / Recall (session-only, no localStorage) ──

  const handleClose = useCallback(() => {
    vibrate([50, 50, 50]);
    setShowBubble(false);
    setInteractBubbleText(null);
    setTapBubble(null);
    setDragBubbleText(null);
    setHidden(true);
    setVisible(false);
    setEntered(false);
  }, []);

  const handleRecall = useCallback(() => {
    setHidden(false);
    setRecallBubble(true);
    const size = getMascotSize(isFullBody(currentAssetId));
    setPos({
      x: window.innerWidth - size - DEFAULT_RIGHT,
      y: window.innerHeight - size * 1.5 - DEFAULT_BOTTOM,
    });
    localStorage.removeItem(STORAGE_KEY_POS);
    setTimeout(() => {
      setVisible(true);
      setTimeout(() => setEntered(true), 50);
    }, 100);
    if (recallBubbleTimer.current) clearTimeout(recallBubbleTimer.current);
    recallBubbleTimer.current = setTimeout(() => setRecallBubble(false), 3000);
  }, [setPos, currentAssetId]);

  // ─── Click handlers ──────────────────────────────

  const handleBubbleClick = useCallback(() => {
    if (hasDragged.current) return;
    const bubble = activeBubbles[bubbleIndex];
    if (bubble?.action) router.push(bubble.action);
  }, [bubbleIndex, router, activeBubbles]);

  const handleMascotClick = useCallback(() => {
    if (hasDragged.current) return;
    vibrate(50);
    handleClose();
  }, [handleClose]);

  // ─── Listen for avatar tap from chat page ─────────

  useEffect(() => {
    const handler = (e: Event) => {
      const emotion = (e as CustomEvent).detail?.emotion as string | undefined;
      if (!emotion) return;
      const mapped = EMOTION_ASSET_MAP[emotion];
      if (!mapped) return;

      // Avatar tap always clears hidden permanently
      if (hidden) {
        handleRecall();
      }

      const caption = mapped.caption || pickRandom(IDLE_CAPTIONS);
      switchAsset(mapped.assetId, caption);
    };
    window.addEventListener('ola-avatar-tap', handler);
    return () => window.removeEventListener('ola-avatar-tap', handler);
  }, [hidden, handleRecall, switchAsset]);

  // ─── Cleanup timers ──────────────────────────────

  useEffect(() => {
    return () => {
      if (dragBubbleTimer.current) clearTimeout(dragBubbleTimer.current);
      if (interactBubbleTimer.current) clearTimeout(interactBubbleTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (tapBubbleTimer.current) clearTimeout(tapBubbleTimer.current);
      if (recallBubbleTimer.current) clearTimeout(recallBubbleTimer.current);
      if (idleRotateTimer.current) clearInterval(idleRotateTimer.current);
    };
  }, []);

  // ─── Render ──────────────────────────────────────

  if (!initialized) return null;

  // Recall button — shows when hidden (including on chat page)
  if (hidden) {
    return (
      <div className="fixed z-50 group" style={{ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT }}>
        <button
          onClick={handleRecall}
          className="relative flex items-center justify-center size-8 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all hover:scale-110 animate-[breathe_2.5s_ease-in-out_infinite]"
          aria-label="叫学姐回来"
        >
          <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" className="size-6" />
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

  // Priority: recall > tap-chat > drag > interact > sales
  const activeBubbleText = dragBubbleText ?? interactBubbleText;
  const showSalesBubble = !activeBubbleText && !tapBubble && !recallBubble && showBubble && hasBubbles && currentBubble;
  const showAnyBubble = recallBubble || !!tapBubble || !!activeBubbleText || showSalesBubble;

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
        className={`fixed select-none transition-all duration-400 ease-out ${
          entered ? 'translate-x-0 opacity-100' : 'translate-x-[120px] opacity-0'
        }`}
        style={{ left: pos.x, top: pos.y, willChange: 'left, top', touchAction: 'none', zIndex: 50 }}
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
            {recallBubble ? (
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
          style={{ width: mascotSize, transition: 'width 0.3s ease-in-out' }}
          onMouseEnter={handleMouseEnter}
        >
          {/* Ola image/video with float animation + fade transition */}
          <div
            onClick={handleMascotClick}
            className={`w-full ${
              dragging.current ? '' : 'animate-[float_3s_ease-in-out_infinite]'
            }`}
            style={bouncing ? { animation: 'olaBounce 300ms ease-out' } : undefined}
          >
            <div style={{ opacity: assetOpacity, transition: 'opacity 0.3s ease-in-out' }} className="w-full">
              {currentMeta?.video_url && !videoError ? (
                <video
                  ref={videoRef}
                  key={currentMeta.video_url}
                  src={currentMeta.video_url}
                  autoPlay
                  playsInline
                  muted
                  preload="auto"
                  loop={currentMeta.play_mode === 'idle' || currentMeta.play_mode === 'loop'}
                  onCanPlay={() => {
                    console.log('[OlaVideo] loaded', { asset_id: currentMeta.asset_id, video_url: currentMeta.video_url, status: 'loaded' });
                    if (videoRef.current) {
                      videoRef.current.muted = muted;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  onEnded={handleVideoEnded}
                  onError={(e) => {
                    const el = e.currentTarget;
                    const code = el.error?.code;
                    const msg = el.error?.message;
                    console.error('[OlaVideo] error', { asset_id: currentMeta.asset_id, video_url: currentMeta.video_url, status: 'error', code, msg });
                    setVideoError(true);
                  }}
                  className="w-full h-auto object-contain pointer-events-none"
                  style={{ background: 'transparent' }}
                />
              ) : (
                <OlaAvatar assetId={currentAssetId} size="md" className="w-full h-auto object-contain pointer-events-none" />
              )}
            </div>
          </div>

          {/* Sound toggle button */}
          {currentMeta?.video_url && (
            <button
              data-close-btn
              onClick={(e) => { e.stopPropagation(); toggleMuted(); }}
              className="absolute -bottom-1.5 -right-1.5 z-10 flex items-center justify-center size-5 rounded-full bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 shadow-sm transition-opacity opacity-0 group-hover:opacity-100"
              aria-label={muted ? '开启声音' : '关闭声音'}
            >
              {muted
                ? <VolumeOff className="size-3 text-gray-400" />
                : <Volume2 className="size-3 text-blue-500" />}
            </button>
          )}
        </div>

        {/* Separate audio element for MP3 track */}
        {currentMeta?.audio_url && (
          <audio ref={audioRef} src={currentMeta.audio_url} loop={currentMeta.play_mode === 'idle' || currentMeta.play_mode === 'loop'} muted={muted} />
        )}

        {/* DEBUG — remove after fixing */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.85)', color: '#0f0', fontSize: 10,
          fontFamily: 'monospace', padding: 4, borderRadius: 4,
          pointerEvents: 'none', zIndex: 999, lineHeight: 1.4,
          wordBreak: 'break-all' as const,
        }}>
          <div>asset: {currentAssetId}</div>
          <div>video_url: {currentMeta?.video_url ? currentMeta.video_url.slice(-40) : 'NULL'}</div>
          <div>error: {String(videoError)}</div>
          <div>mode: {currentMeta?.play_mode ?? 'N/A'}</div>
          <div>render: {currentMeta?.video_url && !videoError ? 'VIDEO' : 'IMAGE'}</div>
        </div>

        {/* Caption below mascot */}
        {currentCaption && !dragging.current && (
          <div
            className="text-center mt-1 pointer-events-none"
            style={{ opacity: assetOpacity, transition: 'opacity 0.3s ease-in-out' }}
          >
            <span className="inline-block px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] leading-tight max-w-[120px] truncate backdrop-blur-sm">
              {currentCaption}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
