'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OlaProactiveBubble } from './OlaProactiveBubble';
import type { OlaState } from './OlaAvatar';

interface Trigger {
  id: string;
  trigger_key: string;
  page: string;
  condition: Record<string, unknown>;
  ola_state: string;
  message_zh: string;
  message_en: string;
  action_type: string | null;
  action_payload: Record<string, unknown> | null;
  priority: number;
}

const COOLDOWN_KEY = 'ola_trigger_cooldowns';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function getCooldowns(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
  } catch {
    return {};
  }
}

function setCooldown(triggerKey: string) {
  const cooldowns = getCooldowns();
  cooldowns[triggerKey] = Date.now();
  // Clean up expired entries
  const now = Date.now();
  for (const key of Object.keys(cooldowns)) {
    if (now - cooldowns[key] > COOLDOWN_MS) delete cooldowns[key];
  }
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function isOnCooldown(triggerKey: string): boolean {
  const cooldowns = getCooldowns();
  const lastShown = cooldowns[triggerKey];
  if (!lastShown) return false;
  return Date.now() - lastShown < COOLDOWN_MS;
}

function pageMatchesRoute(triggerPage: string, pathname: string): boolean {
  if (triggerPage === '*') return true;
  const koalaPath = pathname.replace('/koala/', '');
  if (triggerPage.includes('[id]')) {
    const prefix = triggerPage.replace('/[id]', '');
    return koalaPath.startsWith(prefix + '/') && koalaPath !== prefix;
  }
  return koalaPath === triggerPage || koalaPath.startsWith(triggerPage + '/');
}

function getActionLabel(actionType: string | null): string | undefined {
  if (!actionType) return undefined;
  switch (actionType) {
    case 'open_chat': return '开始聊天';
    case 'navigate': return '去看看';
    case 'show_pricing': return '查看积分包';
    case 'show_url_input': return '试试看';
    default: return undefined;
  }
}

export function OlaTriggerEngine() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTrigger, setActiveTrigger] = useState<Trigger | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const pageEnteredAt = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch triggers for current page
  const fetchTriggers = useCallback(async () => {
    const koalaPath = pathname.replace('/koala/', '').split('/')[0] || 'home';
    try {
      const resp = await fetch(`/api/ola/triggers?page=${koalaPath}`);
      if (resp.ok) {
        const data = await resp.json();
        setTriggers(data.triggers ?? []);
      }
    } catch {}
  }, [pathname]);

  useEffect(() => {
    pageEnteredAt.current = Date.now();
    setActiveTrigger(null);
    fetchTriggers();
  }, [pathname, fetchTriggers]);

  // Evaluate triggers
  useEffect(() => {
    if (triggers.length === 0) return;

    function evaluate() {
      const elapsed = (Date.now() - pageEnteredAt.current) / 1000;

      for (const trigger of triggers) {
        if (isOnCooldown(trigger.trigger_key)) continue;
        if (!pageMatchesRoute(trigger.page, pathname)) continue;

        const cond = trigger.condition;
        // Time-based conditions
        if (cond.time_on_page_seconds && elapsed < (cond.time_on_page_seconds as number)) continue;
        if (cond.idle_seconds && elapsed < (cond.idle_seconds as number)) continue;

        // Simple event-based conditions are evaluated by the page that fires them
        // For time-based and wildcard triggers, we can fire immediately if time is met
        if (cond.time_on_page_seconds || cond.idle_seconds || cond.is_returning || cond.is_new_user) {
          setActiveTrigger(trigger);
          logTrigger(trigger.id, false, false);
          setCooldown(trigger.trigger_key);
          return;
        }
      }
    }

    // Check every 2 seconds
    const interval = setInterval(evaluate, 2000);
    // Also check immediately for non-time-based triggers
    evaluate();

    return () => clearInterval(interval);
  }, [triggers, pathname]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function logTrigger(triggerId: string, clicked: boolean, dismissed: boolean) {
    fetch('/api/ola/trigger-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_id: triggerId,
        page: pathname,
        clicked,
        dismissed,
      }),
    }).catch(() => {});
  }

  function handleAction() {
    if (!activeTrigger) return;
    logTrigger(activeTrigger.id, true, false);

    const action = activeTrigger.action_type;
    if (action === 'open_chat') {
      router.push('/koala/chat');
    } else if (action === 'navigate' && activeTrigger.action_payload?.url) {
      router.push(activeTrigger.action_payload.url as string);
    } else if (action === 'show_pricing') {
      router.push('/koala/pricing');
    } else if (action === 'show_url_input') {
      router.push('/koala/chat');
    }

    setActiveTrigger(null);
  }

  function handleDismiss() {
    if (!activeTrigger) return;
    logTrigger(activeTrigger.id, false, true);
    setActiveTrigger(null);
  }

  if (!activeTrigger) return null;

  return (
    <OlaProactiveBubble
      message={activeTrigger.message_zh}
      olaState={activeTrigger.ola_state as OlaState}
      actionLabel={getActionLabel(activeTrigger.action_type)}
      onAction={activeTrigger.action_type ? handleAction : undefined}
      onDismiss={handleDismiss}
    />
  );
}
