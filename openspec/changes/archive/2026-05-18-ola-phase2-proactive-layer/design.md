## Context

Ola AI currently lives as a floating widget button (OlaWidget in KoalaShell) that navigates to /koala/chat on click. No proactive messaging, no escalation path, no gamification. Phase 2 Part A added FAQ matching, session tracking, and event recording. This builds on that foundation.

Existing Ola components: OlaWidget, OlaAvatar (with states: welcome/thinking/celebrate/suggest/sleepy/cheer/surprise/focus), OlaEmpty, OlaLoading. All in app/koala/components/ola/.

KoalaShell wraps all /koala/* pages with TopNavBar + BottomTabBar + OlaWidget.

## Goals / Non-Goals

**Goals:**
- Proactive trigger system that shows contextual Ola bubbles based on page + user state
- Handoff to human consultant with structured data transfer + admin notification
- Milestone system that rewards key actions with credits and celebration UI
- Admin management for triggers and handoff queue

**Non-Goals:**
- Real-time chat with human consultants (handoff is async via WeChat/email)
- Complex trigger condition evaluation (keep conditions simple, evaluable client-side)
- A/B testing of trigger messages (future)
- Push notifications (future)

## Decisions

### 1. Trigger evaluation runs client-side

Triggers are fetched from API on page load, then conditions are evaluated in the browser (time on page, user state from context). This avoids server roundtrips for timer-based triggers.

### 2. Trigger frequency managed via localStorage + server log

Client checks localStorage for recently shown triggers (fast). Server log records all shows/clicks/dismisses for analytics. 24h cooldown per trigger_key per user.

### 3. Handoff creates a DB record + sends Resend email

No real-time routing. Admin sees pending handoffs in dashboard. User gets WeChat QR to connect directly. Simple and matches current workflow.

### 4. Milestones checked at action time, not via background job

When a user performs an action (search, letter gen, etc.), the API handler calls checkMilestone() synchronously. This is simpler and more reliable than polling.

### 5. OlaProactiveBubble sits next to OlaWidget

The bubble appears anchored to the existing widget position (bottom-right). It doesn't replace the widget — it's a speech bubble coming from Ola's avatar.

## Risks / Trade-offs

- **[Risk] Trigger spam** → 24h cooldown + one-at-a-time display + priority ordering
- **[Risk] Bubble blocks content on mobile** → Position above BottomTabBar, auto-collapse after 10s
- **[Trade-off] Client-side evaluation** → Can't evaluate server-only conditions (credits balance) without API call. Solution: simple conditions are client-side, complex ones (credits) fetched from user context provider.
