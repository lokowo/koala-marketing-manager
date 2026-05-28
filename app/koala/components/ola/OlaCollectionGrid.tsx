'use client';

import { useState, useEffect } from 'react';
import { OlaAvatar } from './OlaAvatar';

interface AssetInfo {
  asset_id: string;
  image_url: string;
  emotion_tag: string | null;
}

interface UnlockInfo {
  asset_id: string;
  unlocked_at: string;
  credits_awarded: number;
}

const SERIES_LABELS: Record<string, string> = {
  a: '📐 基础建模',
  b: '🏃 动作场景',
  c: '👗 反差装扮',
  h: '🖼️ 半身像',
};

function getSeriesKey(assetId: string): string {
  return assetId.split('-')[0];
}

export function OlaCollectionGrid({ userId }: { userId: string }) {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [unlocks, setUnlocks] = useState<UnlockInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch('/api/user/animation-unlocks')
      .then(r => r.json())
      .then(data => {
        setAssets(data.assets ?? []);
        setUnlocks(data.unlocks ?? []);
        setTotal(data.total ?? 0);
        setUnlocked(data.unlocked ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return null;

  const unlockedSet = new Set(unlocks.map(u => u.asset_id));
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  const grouped = new Map<string, AssetInfo[]>();
  for (const a of assets) {
    const key = getSeriesKey(a.asset_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  return (
    <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden bg-white dark:bg-[#111c28] border border-gray-200 dark:border-gray-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50"
      >
        <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
          🎨 小欧图鉴 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({unlocked}/{total})</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{pct}%</span>
          <span className={`text-xs text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-4 max-h-[60vh] overflow-y-auto">
          {Array.from(grouped.entries()).map(([series, items]) => (
            <div key={series}>
              <p className="text-[11px] font-medium text-gray-500 dark:text-[#8a8078] mb-2 px-1">
                {SERIES_LABELS[series] ?? series.toUpperCase()}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {items.map(asset => {
                  const isUnlocked = unlockedSet.has(asset.asset_id);
                  return (
                    <div
                      key={asset.asset_id}
                      className={`relative aspect-square rounded-lg overflow-hidden border ${
                        isUnlocked
                          ? 'border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-900/10'
                          : 'border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-white/5'
                      }`}
                    >
                      {isUnlocked ? (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          <OlaAvatar assetId={asset.asset_id} size="md" round={false} className="w-full h-auto" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl opacity-30">?</span>
                        </div>
                      )}
                      {isUnlocked && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm">
                          <p className="text-[8px] text-white text-center truncate px-0.5">
                            {asset.emotion_tag ?? asset.asset_id}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
