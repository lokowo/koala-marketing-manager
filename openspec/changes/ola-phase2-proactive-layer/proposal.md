## Why

Ola AI is currently reactive — it only responds when users open the chat. Users who don't know Ola exists, are stuck on a page, or achieve something never get proactive help. There's also no way to escalate to a human consultant, and no gamification to encourage feature exploration.

## What Changes

- New page-level trigger system: rules fire based on page + conditions (time on page, user state, events), showing proactive bubbles from Ola
- New handoff-to-human flow: structured escalation with data collection, admin notification via Resend, and WeChat QR card
- New milestone/achievement system: 7 milestones with credit rewards, celebration UI, and profile display
- Admin pages for trigger rule management and handoff queue

## Capabilities

### New Capabilities
- `ola-trigger-system`: Page-level proactive trigger rules, evaluation engine, bubble UI, and trigger logging
- `ola-handoff`: Human escalation API, handoff request storage, email notification, and in-chat handoff card
- `ola-milestones`: Achievement definitions, milestone detection logic, credit rewards, celebration UI, and profile display
- `admin-triggers-handoff`: Admin pages for managing trigger rules and viewing handoff queue

### Modified Capabilities
<!-- None -->

## Impact

- `app/koala/components/KoalaShell.tsx` — add OlaTriggerEngine
- `app/koala/components/ola/` — new components: OlaProactiveBubble, OlaHandoffCard, OlaCelebration
- `app/api/ola/` — new API routes: triggers, trigger-log, handoff
- `app/api/admin/ola-triggers/` — new admin API routes
- `app/lib/ola/` — new: ola-milestones.ts
- `app/dashboard/koala/` — new admin pages: triggers, handoff
- `app/dashboard/koala/layout.tsx` — sidebar entries
- `app/koala/my-profile/page.tsx` — achievements section
- Database: 5 new tables (ola_triggers, ola_trigger_logs, handoff_requests, ola_milestones, user_milestones)
