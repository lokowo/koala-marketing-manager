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

function fetchAllAssets(): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = supabase
    .from('ola_assets')
    .select('asset_id, emotion_tag, image_url')
    .eq('is_active', true)
    .then(({ data }) => {
      if (data) {
        for (const row of data) {
          assetCache.set(`id:${row.asset_id}`, row.image_url);
          if (row.emotion_tag) {
            assetCache.set(`emotion:${row.emotion_tag}`, row.image_url);
          }
        }
      }
      allAssetsFetched = true;
    })
    .catch(() => { allAssetsFetched = true; });
  return fetchPromise;
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
}

export function OlaAvatar({ assetId, emotionTag, state, size = 'md', className }: OlaAvatarProps) {
  const px = SIZE_MAP[size];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
    if (assetId) {
      url = assetCache.get(`id:${assetId}`);
    }
    if (!url && emotionTag) {
      url = assetCache.get(`emotion:${emotionTag}`);
    }
    if (!url && state) {
      // Map legacy OlaState to emotion_tag
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
    }
    if (!url) {
      url = assetCache.get(`id:${DEFAULT_ASSET_ID}`);
    }

    setImageUrl(url ?? null);
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

  return (
    <Image
      src={imageUrl}
      alt="Ola"
      width={px}
      height={px}
      className={`rounded-full object-cover ${className ?? ''}`}
      unoptimized
    />
  );
}
