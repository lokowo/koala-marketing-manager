## 1. Ola Persona Prompt

- [x] 1.1 Create `app/lib/prompts/ola-persona.ts` with `getOlaPersonaPrompt()` — full 小欧学姐 persona, language rules, reply rules, guidance rules, competitor script
- [x] 1.2 Integrate persona prompt into `app/api/ai/chat/route.ts` — replace generic system prompt with Ola persona when applicable

## 2. Emotion Detection

- [x] 2.1 Create `app/lib/ola/ola-emotion.ts` — `detectEmotion()` with anxious/frustrated keyword matching
- [x] 2.2 Integrate emotion detection into chat route — inject emotion-aware instructions into system prompt

## 3. Funnel Stage Tracking

- [x] 3.1 Add stage tracking instruction to system prompt — `<stage>N</stage>` tag directive
- [x] 3.2 Parse stage tag from Claude reply, update session conversation_stage, strip tag from response

## 4. Prompt Assembly Order

- [x] 4.1 Refactor chat route prompt assembly to follow standard order: persona → emotion → user context → RAG → stage tracking → professor rules

## 5. Admin FAQ Management

- [x] 5.1 Add "FAQ 管理" entry to admin sidebar in `app/dashboard/koala/layout.tsx`
- [x] 5.2 Create FAQ management page with CRUD (list, create/edit modal, delete, enable/disable toggle) + FAQ test panel
