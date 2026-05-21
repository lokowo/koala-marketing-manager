## Why

Voice input has two critical UX issues: (1) users get minimal visual feedback when recording — only a subtle Tailwind `animate-pulse` on a small button, no timer, no status text — so they don't know if it's working; (2) the Whisper API route hardcodes `language: lang` (defaulting to `'zh'`), which cripples English and mixed-language recognition. Both issues degrade the core chat experience.

## What Changes

- **VoiceInputButton**: Replace Tailwind `animate-pulse` with a prominent custom CSS pulse animation (red glow ring). Add a recording duration timer display ("0:05"). Show transcription-in-progress state ("识别中..." + spinner).
- **useVoiceInput hook**: Add `isTranscribing` state and `recordingDuration` timer. Expose these to the component. In Whisper mode, set `isTranscribing = true` between stop and transcript return.
- **API route `/api/voice/transcribe`**: Remove the `language` parameter from the Whisper API call so Whisper auto-detects language (supports zh, en, and mixed).
- **Chat input area**: Show "正在录音..." placeholder text in the input field while recording, and "识别中..." while transcribing.

## Capabilities

### New Capabilities
_(none — this is a fix/enhancement to existing voice input)_

### Modified Capabilities
_(no existing OpenSpec specs cover voice input)_

## Impact

- **Files modified**:
  - `app/components/VoiceInputButton.tsx` — visual feedback overhaul
  - `app/lib/hooks/useVoiceInput.ts` — add `isTranscribing`, `recordingDuration` states
  - `app/api/voice/transcribe/route.ts` — remove hardcoded `language` param
  - `app/koala/chat/page.tsx` — integrate recording/transcribing status into input area
- **No new dependencies**: CSS animation is custom keyframes, timer uses `setInterval`
- **No DB changes**
- **No breaking changes**: existing `VoiceInputButton` API remains backward-compatible (new props optional)
