'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase/client';

export type OlaState = 'welcome' | 'thinking' | 'celebrate' | 'suggest' | 'sleepy' | 'cheer' | 'surprise' | 'focus';

const SIZE_MAP = { sm: 32, md: 48, lg: 128, xl: 512 } as const;
export type OlaSize = keyof typeof SIZE_MAP;

const DEFAULT_ASSET_ID = 'h-02-morning-coffee-nobg';

// In-memory cache shared across all OlaAvatar instances
const assetCache = new Map<string, string>();
let allAssetsFetched = false;
let fetchPromise: Promise<void> | null = null;

export interface OlaAssetMeta {
  asset_id: string;
  image_url: string;
  video_url: string | null;
  audio_url: string | null;
  media_type: string;
  play_mode: string;
}

const assetMetaCache = new Map<string, OlaAssetMeta>();

interface OlaAssetRow {
  asset_id: string;
  emotion_tag: string | null;
  image_url: string;
  video_url: string | null;
  audio_url: string | null;
  media_type: string | null;
  play_mode: string | null;
}

async function fetchAllAssets(): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const { data } = await (supabase
        .from('ola_assets' as 'professors')
        .select('asset_id, emotion_tag, image_url, video_url, audio_url, media_type, play_mode')
        .eq('is_active', true as never));
      if (data) {
        for (const row of data as unknown as OlaAssetRow[]) {
          assetCache.set(`id:${row.asset_id}`, row.image_url);
          if (row.emotion_tag) {
            assetCache.set(`emotion:${row.emotion_tag}`, row.image_url);
          }
          const meta: OlaAssetMeta = {
            asset_id: row.asset_id,
            image_url: row.image_url,
            video_url: row.video_url,
            audio_url: row.audio_url,
            media_type: row.media_type ?? 'static',
            play_mode: row.play_mode ?? 'static',
          };
          assetMetaCache.set(row.asset_id, meta);
        }
      }
    } catch { /* ignore */ }
    allAssetsFetched = true;
  })();
  return fetchPromise;
}

export function getAssetMeta(assetId: string): OlaAssetMeta | undefined {
  return assetMetaCache.get(assetId);
}

export function ensureAssetsLoaded(): Promise<void> {
  if (allAssetsFetched) return Promise.resolve();
  return fetchAllAssets();
}

interface OlaAvatarProps {
  /** asset_id from ola_assets table */
  assetId?: string;
  /** emotion_tag — used as fallback if assetId not provided */
  emotionTag?: string;
  /** Legacy state prop for backward compatibility */
  state?: OlaState;
  size?: OlaSize;
  className?: string;
  /** When true, clips image to a circle (default: auto-detect from asset prefix — h-* = true, b-* = false) */
  round?: boolean;
}

export function OlaAvatar({ assetId, emotionTag, state, size = 'md', className, round }: OlaAvatarProps) {
  const px = SIZE_MAP[size];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resolvedAssetId, setResolvedAssetId] = useState<string | undefined>(assetId);
  const [ready, setReady] = useState(allAssetsFetched);

  useEffect(() => {
    if (allAssetsFetched) {
      setReady(true);
      return;
    }
    fetchAllAssets().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;

    // Priority: assetId > emotionTag > legacy state mapping > default
    let url: string | undefined;
    let resolved = assetId;
    if (assetId) {
      url = assetCache.get(`id:${assetId}`);
    }
    if (!url && emotionTag) {
      url = assetCache.get(`emotion:${emotionTag}`);
      if (url) resolved = emotionTag;
    }
    if (!url && state) {
      const stateToEmotion: Record<OlaState, string> = {
        welcome: 'cozy',
        thinking: 'confident',
        celebrate: 'pure-joy',
        suggest: 'enthusiastic',
        sleepy: 'sleepy',
        cheer: 'excited',
        surprise: 'excited',
        focus: 'determined',
      };
      url = assetCache.get(`emotion:${stateToEmotion[state]}`);
      if (url) resolved = stateToEmotion[state];
    }
    if (!url) {
      url = assetCache.get(`id:${DEFAULT_ASSET_ID}`);
      resolved = DEFAULT_ASSET_ID;
    }

    setImageUrl(url ?? null);
    setResolvedAssetId(resolved);
  }, [ready, assetId, emotionTag, state]);

  // Fallback to legacy SVG while loading or if no DB image found
  if (!imageUrl) {
    const fallbackState = state ?? 'welcome';
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/images/ola/ola-${fallbackState}.svg`}
        alt="Ola"
        width={px}
        height={px}
        className={className}
      />
    );
  }

  // Auto-detect: body images (b-*) are transparent full-body PNGs — no circular clip
  const isBodyImage = resolvedAssetId?.startsWith('b-');
  const shouldRound = round ?? !isBodyImage;

  return (
    <Image
      src={imageUrl}
      alt="Ola"
      width={px}
      height={px}
      className={`${shouldRound ? 'rounded-full object-cover' : 'rounded-lg object-contain'} ${className ?? ''}`}
      unoptimized
    />
  );
}
