## Context

Voice input is used in 3 places: chat page, professor search, and profile form. The current implementation has two modes (`browser` = Web Speech API, `whisper` = MediaRecorder → OpenAI Whisper). The default mode across all usages is `'browser'`.

Current problems:
1. **Visual feedback**: Only Tailwind's `animate-pulse` on a 36px button — too subtle. No timer, no transcription loading state.
2. **Language detection**: The Whisper API route passes `language: lang` (hardcoded to `'zh'` or `'en'`), preventing auto-detection of mixed-language speech.

## Goals / Non-Goals

**Goals:**
- Recording state is unmistakable: red glow pulse + duration timer
- Transcription-in-progress state is visible: spinner + "识别中..."
- Whisper auto-detects language (zh/en/mixed) without client-side language hint
- Changes are backward-compatible — existing usages don't break

**Non-Goals:**
- Switching all usages from browser mode to Whisper mode (out of scope)
- Real-time streaming transcription
- Adding new voice input to pages that don't have it

## Decisions

### 1. Custom CSS keyframes instead of Tailwind animate-pulse
Tailwind's `animate-pulse` changes opacity — too subtle for a "you're being recorded" indicator. A custom `@keyframes voice-pulse` with expanding `box-shadow` ring is more visible and matches the user's spec.

**Alternative considered**: Framer Motion animation — rejected, unnecessary dependency for a single keyframe.

### 2. Timer via `setInterval` in the hook, not the component
`recordingDuration` state lives in `useVoiceInput` so any consumer can display it. The hook starts a 1-second interval on `startListening` and clears it on stop. Avoids duplicating timer logic across 3 integration points.

### 3. `isTranscribing` state in hook (Whisper mode only)
Between `mediaRecorder.stop()` and the fetch response, the hook sets `isTranscribing = true`. This lets VoiceInputButton show a spinner. In browser mode, `isTranscribing` is always `false` (Web Speech API streams results).

### 4. Remove `language` param from Whisper API entirely
Whisper-1 auto-detects language with high accuracy. Removing the param fixes English and mixed-language recognition with zero downside. The client-side `lang` prop remains for browser mode's `SpeechRecognition.lang`.

### 5. Recording status in chat input only
The "正在录音..." / "识别中..." text replaces the input placeholder only on `app/koala/chat/page.tsx`. The professor search and profile form integrations are too compact for status text — the button animation alone is sufficient there.

## Risks / Trade-offs

- **[Risk] Custom keyframes add global CSS** → Mitigation: Scoped via Tailwind `@layer utilities` or inline in the component. Minimal footprint.
- **[Risk] Removing language param might reduce accuracy for known-language scenarios** → Mitigation: Whisper auto-detection is well-tested for zh/en. If regression occurs, can add back as optional override. Current behavior (hardcoding `'zh'`) is strictly worse.
- **[Risk] `setInterval` timer drift** → Mitigation: Acceptable for a UI display timer; not used for anything precision-critical.
