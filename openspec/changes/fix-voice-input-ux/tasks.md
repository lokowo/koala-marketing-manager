## 1. Hook: useVoiceInput enhancements

- [ ] 1.1 Add `isTranscribing` state — set `true` between `mediaRecorder.stop()` and Whisper API response, `false` otherwise
- [ ] 1.2 Add `recordingDuration` state with 1-second `setInterval` timer — start on `startListening`, clear on stop, reset to 0 on new recording
- [ ] 1.3 Remove `lang` from Whisper FormData (`formData.append('lang', ...)`) — Whisper mode should not send language to API

## 2. API: Remove hardcoded language parameter

- [ ] 2.1 In `/api/voice/transcribe/route.ts`, remove `whisperFormData.append('language', lang)` line so Whisper auto-detects language

## 3. Component: VoiceInputButton visual overhaul

- [ ] 3.1 Add custom `@keyframes voice-pulse` CSS animation (`box-shadow` ring, `rgba(239,68,68,0.4)`, 1.5s cycle) — replace Tailwind `animate-pulse`
- [ ] 3.2 Show recording duration timer ("0:05") next to button when `isListening`
- [ ] 3.3 Show spinner icon + "识别中..." when `isTranscribing` is true

## 4. Chat page: Recording status integration

- [ ] 4.1 Pass `isListening` and `isTranscribing` from `useVoiceInput` to the chat input textarea placeholder — "正在录音..." / "识别中..."
- [ ] 4.2 Wire up VoiceInputButton in chat page to use the new hook states

## 5. Verification

- [ ] 5.1 Tap microphone → red pulse animation + timer visible
- [ ] 5.2 Stop recording (Whisper mode) → "识别中..." + spinner shown
- [ ] 5.3 Chinese speech → correct transcription
- [ ] 5.4 English speech → correct transcription
- [ ] 5.5 `npm run build` passes with no errors
