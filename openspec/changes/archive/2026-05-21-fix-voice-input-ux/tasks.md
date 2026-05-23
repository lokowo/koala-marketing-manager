## 1. Hook: useVoiceInput enhancements

- [x] 1.1 Add `isTranscribing` state — set `true` between `mediaRecorder.stop()` and Whisper API response, `false` otherwise
- [x] 1.2 Add `recordingDuration` state with 1-second `setInterval` timer — start on `startListening`, clear on stop, reset to 0 on new recording
- [x] 1.3 Remove `lang` from Whisper FormData (`formData.append('lang', ...)`) — Whisper mode should not send language to API

## 2. API: Remove hardcoded language parameter

- [x] 2.1 In `/api/voice/transcribe/route.ts`, remove `whisperFormData.append('language', lang)` line so Whisper auto-detects language

## 3. Component: VoiceInputButton visual overhaul

- [x] 3.1 Add custom `@keyframes voice-pulse` CSS animation (`box-shadow` ring, `rgba(239,68,68,0.4)`, 1.5s cycle) — replace Tailwind `animate-pulse`
- [x] 3.2 Show recording duration timer ("0:05") next to button when `isListening`
- [x] 3.3 Show spinner icon + "识别中..." when `isTranscribing` is true

## 4. Chat page: Recording status integration

- [x] 4.1 Pass `isListening` and `isTranscribing` from `useVoiceInput` to the chat input textarea placeholder — "正在录音..." / "识别中..."
- [x] 4.2 Wire up VoiceInputButton in chat page to use the new hook states

## 5. Verification

- [x] 5.1 Tap microphone → red pulse animation + timer visible
- [x] 5.2 Stop recording (Whisper mode) → "识别中..." + spinner shown
- [x] 5.3 Chinese speech → correct transcription
- [x] 5.4 English speech → correct transcription
- [x] 5.5 `npm run build` passes with no errors
