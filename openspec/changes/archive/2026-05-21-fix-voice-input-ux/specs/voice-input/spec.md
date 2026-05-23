## ADDED Requirements

### Requirement: Recording visual feedback with pulse animation
The VoiceInputButton SHALL display a prominent red glow pulse animation (custom CSS `@keyframes` with expanding `box-shadow`) when `isListening` is true. The animation SHALL use `rgba(239,68,68,0.4)` expanding to 10px, cycling every 1.5s.

#### Scenario: User starts recording
- **WHEN** user taps the microphone button
- **THEN** the button background changes to red, and a pulsing red glow ring animates around it continuously

#### Scenario: User stops recording
- **WHEN** user taps the microphone button again to stop
- **THEN** the pulse animation stops immediately and the button returns to its default gold style

### Requirement: Recording duration timer
The `useVoiceInput` hook SHALL track `recordingDuration` (seconds elapsed) via a 1-second `setInterval` starting when recording begins and clearing when recording stops. The VoiceInputButton SHALL display the formatted duration (e.g. "0:05") next to the button while recording.

#### Scenario: Timer displays during recording
- **WHEN** recording is active for 5 seconds
- **THEN** a "0:05" label is visible adjacent to the microphone button

#### Scenario: Timer resets on new recording
- **WHEN** a previous recording ended at 0:12 and user starts a new recording
- **THEN** the timer resets to "0:00" and begins counting again

### Requirement: Transcription-in-progress state
The `useVoiceInput` hook SHALL expose an `isTranscribing` boolean that is `true` between `mediaRecorder.stop()` and the Whisper API response (Whisper mode only). The VoiceInputButton SHALL display a loading spinner and the text "识别中..." when `isTranscribing` is true.

#### Scenario: Whisper transcription in progress
- **WHEN** user stops recording in Whisper mode
- **THEN** the button shows a spinner icon and "识别中..." until the API responds

#### Scenario: Browser mode has no transcribing state
- **WHEN** user stops recording in browser mode
- **THEN** `isTranscribing` remains `false` (Web Speech API streams results inline)

### Requirement: Chat input recording status text
The chat page input area SHALL display "正在录音..." as placeholder text while `isListening` is true, and "识别中..." while `isTranscribing` is true.

#### Scenario: Recording status in chat input
- **WHEN** voice recording is active on the chat page
- **THEN** the input textarea placeholder reads "正在录音..."

#### Scenario: Transcribing status in chat input
- **WHEN** voice transcription is in progress on the chat page
- **THEN** the input textarea placeholder reads "识别中..."

### Requirement: Whisper auto-detects language
The `/api/voice/transcribe` route SHALL NOT pass a `language` parameter to the OpenAI Whisper API, allowing Whisper to auto-detect the spoken language.

#### Scenario: English speech is recognized
- **WHEN** user speaks English into the microphone
- **THEN** Whisper returns accurate English transcription

#### Scenario: Chinese speech is recognized
- **WHEN** user speaks Chinese into the microphone
- **THEN** Whisper returns accurate Chinese transcription

#### Scenario: Mixed language speech is recognized
- **WHEN** user speaks a mix of Chinese and English
- **THEN** Whisper returns transcription preserving both languages
