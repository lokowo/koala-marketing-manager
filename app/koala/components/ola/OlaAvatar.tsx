'use client';

import { useState } from 'react';
import Image from 'next/image';

export type OlaState = 'welcome' | 'thinking' | 'celebrate' | 'suggest' | 'sleepy' | 'cheer' | 'surprise' | 'focus';

const SIZE_MAP = { sm: 32, md: 48, lg: 128, xl: 512 } as const;
export type OlaSize = keyof typeof SIZE_MAP;

interface OlaAvatarProps {
  state: OlaState;
  size?: OlaSize;
  className?: string;
}

export function OlaAvatar({ state, size = 'md', className }: OlaAvatarProps) {
  const px = SIZE_MAP[size];
  const usePng = size === 'lg' || size === 'xl';
  const pngSize = size === 'xl' ? 512 : 128;
  const [pngFailed, setPngFailed] = useState(false);

  if (usePng && !pngFailed) {
    return (
      <Image
        src={`/images/ola/ola-${state}-${pngSize}.png`}
        alt={`Ola ${state}`}
        width={px}
        height={px}
        className={className}
        onError={() => setPngFailed(true)}
        unoptimized
      />
    );
  }

  // SVG fallback or sm/md sizes
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/ola/ola-${state}.svg`}
      alt={`Ola ${state}`}
      width={px}
      height={px}
      className={className}
    />
  );
}
