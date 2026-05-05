'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import TinderCard from 'react-tinder-card';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Undo2, Mail, Heart, SlidersHorizontal, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';

const UNI: Record<string, { bg: string; fg: string; short: string }> = {
  'Australian National University':  { bg: '#c4a050', fg: '#1a2332', short: 'ANU' },
  'University of Melbourne':         { bg: '#003087', fg: '#fff',    short: 'MEL' },
  'University of Sydney':            { bg: '#cc0000', fg: '#fff',    short: 'SYD' },
  'UNSW Sydney':                     { bg: '#1a1a1a', fg: '#ffe600', short: 'NSW' },
  'University of Queensland':        { bg: '#51247a', fg: '#fff',    short: 'UQ'  },
  'Monash University':               { bg: '#006dae', fg: '#fff',    short: 'MON' },
  'University of Western Australia': { bg: '#003087', fg: '#fff',    short: 'UWA' },
  'University of Adelaide':          { bg: '#005a9c', fg: '#fff',    short: 'ADE' },
};

function getUni(name: string) {
  return UNI[name] ?? { bg: '#5a6878', fg: '#fff', short: name.replace(/University of |University /gi, '').slice(0, 3).toUpperCase() };
}

function recruitBadge(score: number) {
  if (score >= 70) return { label: '招生中', color: '#22c55e' };
  if (score >= 40) return { label: '可能', color: '#eab308' };
  return { label: '', color: '' };
}

interface Professor {
  id: string; name: string; university: string; positionTitle: string;
  researchAreas: string[]; hIndex: number; paperCount: number;
  citationCount: number; opportunityScore: number; email: string;
  matchScore?: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [swipeLabel, setSwipeLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const cardRefs = useRef<Record<string, any>>({});
  const [lastSwiped, setLastSwiped] = useState<Professor | null>(null);

  useEffect(() => { fetchProfessors(); }, []);

  async function fetchProfessors() {
    setLoading(true);
    try {
      const res = await fetch('/api/professors?limit=20&sortBy=opportunity_score');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const profs = (data.data ?? data.professors ?? data ?? []).map((p: Professor) => ({
        ...p, matchScore: p.matchScore ?? Math.floor(60 + Math.random() * 35),
      }));
      setProfessors(profs);
      setCurrentIndex(profs.length - 1);
    } catch { setProfessors([]); }
    setLoading(false);
  }

  const handleSwipe = useCallback(async (direction: string, prof: Professor) => {
    setSwipeLabel(null);
    setCurrentIndex(prev => prev - 1);
    setLastSwiped(prof);
    if (direction === 'right' || direction === 'up') {
      try {
        await fetch('/api/user/saved-professors', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ professor_id: prof.id, source: direction === 'up' ? 'super_like' : 'swipe', match_score: prof.matchScore }),
        });
      } catch {}
    }
    if (direction === 'up') router.push('/koala/chat?professor=' + prof.id + '&mode=write');
  }, [router]);

  function swipeBtn(dir: string) {
    const prof = professors[currentIndex];
    if (!prof || !cardRefs.current[prof.id]) return;
    cardRefs.current[prof.id].swipe(dir);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <span className="text-4xl">🐨</span>
        <p style={{ color: '#8a9a8e' }}>正在寻找适合你的导师...</p>
      </div>
    );
  }

  if (currentIndex < 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-6 text-center">
        <span className="text-5xl">🐨</span>
        <h2 className="text-xl font-semibold" style={{ color: '#c9a96e' }}>今天的推荐都看完了</h2>
        <p style={{ color: '#8a9a8e' }}>明天再来看新教授吧</p>
        <button onClick={() => router.push('/koala/matches')} className="mt-4 px-6 py-3 rounded-full text-sm font-medium" style={{ background: 'rgba(201,169,110,0.15)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.3)' }}>
          去看看已收藏的教授 →
        </button>
      </div>
    );
  }return (
    <div className="flex flex-col h-[calc(100svh-88px)]">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }}>
          <SlidersHorizontal className="size-3.5" /> 筛选
        </button>
        <h1 className="text-sm font-medium" style={{ color: '#e8e4dc', letterSpacing: '1px' }}>发现导师</h1>
        <button className="relative p-2" onClick={() => router.push('/koala/matches')}>
          <Bell className="size-5" style={{ color: '#5a6a6e' }} />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4">
            <div className="flex gap-2 pb-3 overflow-x-auto">
              {['CS', '医学', '工程', '生物', '物理', '化学', '材料', '商科'].map(tag => (
                <button key={tag} className="px-3 py-1 rounded-full text-xs whitespace-nowrap" style={{ background: 'rgba(201,169,110,0.08)', color: '#8a9a8e', border: '1px solid rgba(201,169,110,0.15)' }}>{tag}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex items-center justify-center relative px-4">
        <div className="relative w-full" style={{ maxWidth: 340, height: 440 }}>
          {professors.map((prof, index) => {
            if (index > currentIndex) return null;
            const stackPos = currentIndex - index;
            if (stackPos > 2) return null;
            const isFlipped = flippedId === prof.id;
            const uni = getUni(prof.university);
            const badge = recruitBadge(prof.opportunityScore);

            return (
              <TinderCard
                key={prof.id}
                ref={(el: any) => { cardRefs.current[prof.id] = el; }}
                onSwipe={(dir: string) => handleSwipe(dir, prof)}
                onSwipeRequirementFulfilled={(dir: string) => {
                  if (dir === 'right') setSwipeLabel('❤️ 收藏');
                  if (dir === 'left') setSwipeLabel('✕ 跳过');
                  if (dir === 'up') setSwipeLabel('✉️ 写信');
                }}
                onSwipeRequirementUnfulfilled={() => setSwipeLabel(null)}
                preventSwipe={['down']}
                swipeRequirementType="position"
                swipeThreshold={80}
                className="absolute inset-0 pressable"
              >
                <div
                  style={{ transform: 'scale(' + (1 - stackPos * 0.04) + ') translateY(' + (stackPos * 10) + 'px)', opacity: stackPos === 0 ? 1 : 0.7 - stackPos * 0.2, zIndex: 10 - stackPos }}
                  className="w-full h-full"
                >
                  <div
                    onClick={() => stackPos === 0 && setFlippedId(isFlipped ? null : prof.id)}
                    className="w-full h-full rounded-2xl overflow-hidden relative cursor-pointer"
                    style={{ background: 'linear-gradient(180deg, #111c28 0%, #0d1520 100%)', border: '1px solid rgba(201,169,110,0.12)', boxShadow: stackPos === 0 ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.2)' }}
                  >
                    {stackPos === 0 && swipeLabel && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <span className="text-3xl font-bold text-white px-5 py-2 rounded-xl border-2 border-white" style={{ transform: 'rotate(-15deg)' }}>{swipeLabel}</span>
                      </div>
                    )}

                    {!isFlipped ? (
                      <div className="p-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-5">
                          <div className="px-2.5 py-1 rounded-md text-xs font-bold" style={{ background: uni.bg, color: uni.fg }}>{uni.short}</div>
                          {badge.label && <div className="flex items-center gap-1"><div className="size-2 rounded-full" style={{ background: badge.color }} /><span className="text-xs" style={{ color: badge.color }}>{badge.label}</span></div>}
                        </div>
                        <h2 className="text-lg font-semibold mb-1" style={{ color: '#e8e4dc' }}>{prof.name}</h2>
                        <p className="text-xs mb-4" style={{ color: '#6a7a7e' }}>{prof.positionTitle ?? 'Researcher'}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {(prof.researchAreas ?? []).slice(0, 3).map((area, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }}>{area}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs mb-auto" style={{ color: '#6a7a7e' }}>
                          <span>H={prof.hIndex ?? '?'}</span><span>·</span><span>{prof.paperCount ?? '?'} papers</span><span>·</span><span>{(prof.citationCount ?? 0).toLocaleString()} 引用</span>
                        </div>
                        <div className="my-4" style={{ height: 1, background: 'rgba(201,169,110,0.1)' }} />
                        <div className="text-center mb-2">
                          <span className="text-2xl font-bold" style={{ color: '#c9a96e' }}>{prof.matchScore}%</span>
                          <span className="text-xs ml-1" style={{ color: '#8a9a8e' }}>匹配</span>
                        </div>
                        <div className="text-center"><span className="text-[11px]" style={{ color: '#5a6a6e' }}>点击查看详情 →</span></div>
                      </div>
                    ) : (
                      <div className="p-5 flex flex-col h-full overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold" style={{ color: '#e8e4dc' }}>{prof.name}</h3>
                          <button onClick={(e) => { e.stopPropagation(); setFlippedId(null); }} className="text-xs px-2 py-1 rounded" style={{ color: '#8a9a8e', background: 'rgba(255,255,255,0.05)' }}>← 翻回</button>
                        </div>
                        <p className="text-xs mb-3" style={{ color: '#6a7a7e' }}>{prof.university} · {prof.positionTitle}</p>
                        <div className="mb-3">
                          <p className="text-[10px] uppercase mb-1.5" style={{ color: '#5a6a6e', letterSpacing: '1px' }}>研究方向</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#a8b8ac' }}>{(prof.researchAreas ?? []).join(' · ')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[{ l: 'H-index', v: prof.hIndex ?? '?' }, { l: '论文', v: prof.paperCount ?? '?' }, { l: '引用', v: (prof.citationCount ?? 0).toLocaleString() }].map(s => (
                            <div key={s.l} className="text-center p-2 rounded-lg" style={{ background: 'rgba(201,169,110,0.06)' }}>
                              <div className="text-sm font-semibold" style={{ color: '#c9a96e' }}>{s.v}</div>
                              <div className="text-[9px]" style={{ color: '#6a7a7e' }}>{s.l}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-auto flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); router.push('/koala/chat?professor=' + prof.id + '&mode=write'); }} className="flex-1 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'linear-gradient(135deg, #c9a96e, #a68540)', color: '#080c10' }}>✉️ 写申请信</button>
                          <button onClick={(e) => { e.stopPropagation(); router.push('/koala/professors/' + prof.id); }} className="flex-1 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.25)' }}>👤 完整档案</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TinderCard>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 py-4">
        <button onClick={() => swipeBtn('left')} className="size-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <X className="size-5" style={{ color: '#6a7a7e' }} />
        </button>
        <button onClick={() => {}} className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.2)', opacity: lastSwiped ? 1 : 0.3 }}>
          <Undo2 className="size-4" style={{ color: '#eab308' }} />
        </button>
        <button onClick={() => swipeBtn('up')} className="size-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <Mail className="size-5" style={{ color: '#60a5fa' }} />
        </button>
        <button onClick={() => swipeBtn('right')} className="size-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Heart className="size-5" style={{ color: '#22c55e' }} />
        </button>
      </div>
    </div>
  );
}