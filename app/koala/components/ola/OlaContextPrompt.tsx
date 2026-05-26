'use client';

import { useState, useEffect, useRef } from 'react';
import { OlaProactiveBubble } from './OlaProactiveBubble';
import type { OlaState } from './OlaAvatar';

interface Phase {
  message: string;
  olaState: OlaState;
  actionLabel?: string;
  onAction?: () => void;
  autoHideMs?: number;
}

interface OlaContextPromptProps {
  cooldownKey: string;
  delayRange: [number, number];
  phases: Phase[];
  cooldownMs?: number;
}

const COOLDOWN_PREFIX = 'ola_ctx_';

function isOnCooldown(key: string, ms: number): boolean {
  try {
    const stored = localStorage.getItem(COOLDOWN_PREFIX + key);
    if (!stored) return false;
    return Date.now() - parseInt(stored, 10) < ms;
  } catch {
    return false;
  }
}

function setCooldown(key: string) {
  try {
    localStorage.setItem(COOLDOWN_PREFIX + key, String(Date.now()));
  } catch {}
}

export function OlaContextPrompt({ cooldownKey, delayRange, phases, cooldownMs = 24 * 60 * 60 * 1000 }: OlaContextPromptProps) {
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOnCooldown(cooldownKey, cooldownMs)) return;

    const [min, max] = delayRange;
    const delay = (min + Math.random() * (max - min)) * 1000;

    timerRef.current = setTimeout(() => {
      setCooldown(cooldownKey);
      setPhaseIndex(0);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldownKey, cooldownMs, delayRange]);

  useEffect(() => {
    if (phaseIndex < 0 || phaseIndex >= phases.length) return;
    const phase = phases[phaseIndex];
    if (!phase.autoHideMs) return;

    const t = setTimeout(() => setPhaseIndex(-1), phase.autoHideMs);
    return () => clearTimeout(t);
  }, [phaseIndex, phases]);

  if (phaseIndex < 0 || phaseIndex >= phases.length) return null;

  const phase = phases[phaseIndex];

  function handleDismiss() {
    if (phaseIndex + 1 < phases.length) {
      setPhaseIndex(phaseIndex + 1);
    } else {
      setPhaseIndex(-1);
    }
  }

  return (
    <div className="fixed bottom-[160px] right-4 lg:bottom-[72px] lg:right-6 z-[9998]">
      <OlaProactiveBubble
        key={phaseIndex}
        message={phase.message}
        olaState={phase.olaState}
        actionLabel={phase.actionLabel}
        onAction={phase.onAction}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
