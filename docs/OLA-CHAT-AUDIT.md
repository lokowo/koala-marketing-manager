# Ola Chat System Architecture Audit

> Generated: 2026-05-24
> Scope: All chat/conversation-related code in koala-marketing-manager

---

## 1. System Overview

Ola (小欧) is the AI chat assistant for Koala PhD. Users interact with Ola through a single-page chat interface (`/koala/chat`) that supports 6 conversation modes. The backend proxies all requests through one API endpoint (`/api/ai/chat`) to Claude Sonnet 4.6 with tool use, and performs async background tasks (memory extraction, profile updates, session tracking).

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: app/koala/chat/page.tsx (1,760 lines)                │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ ModeTabs  │ │ Messages   │ │ Input    │ │ ChatHistory     │  │
│  │ (6 modes) │ │ + Cards    │ │ + Voice  │ │ Sidebar         │  │
│  └──────────┘ └────────────┘ └──────────┘ └─────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/ai/chat
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: app/api/ai/chat/route.ts (989 lines)                  │
│                                                                  │
│  1. Intent detection                                             │
│  2. System prompt assembly (global + mode + memories + emotion)  │
│  3. Claude tool-use loop (max 3 iterations)                      │
│     └─ Tool: searchProfessors → Supabase professors table        │
│  4. Response parsing (JSON blocks → cards)                       │
│  5. Background tasks (fire-and-forget):                          │
│     ├─ saveConversation → ai_conversations                       │
│     ├─ extractAndSaveMemories → user_memories                    │
│     ├─ extractAndUpdateProfile → user_profiles                   │
│     ├─ upsertSession → ola_sessions                              │
│     └─ recordProfessorInteractions → analytics                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. AI Modes

| Mode | Key | Prompt File | Description |
|------|-----|-------------|-------------|
| 申请规划 | `path` | `prompts/path-assessment.ts` (77L) | PhD pathway assessment, 3-stage scoring |
| 科研助手 | `research` | `prompts/research-dive.ts` (75L) | RAG-powered academic Q&A with citations |
| 自由聊天 | `chat` | `prompts/companion.ts` (33L) | General companion/support mode |
| 写申请信 | `write` | `prompts/writing.ts` (88L) | Academic writing assistance |
| RP 助手 | `rp` | `prompts/rp.ts` (33L) | Research proposal writing |
| 模拟面试 | `interview` | `prompts/interview.ts` (35L) | Interview simulation |

Type: `AIMode = 'path' | 'research' | 'chat' | 'write' | 'rp' | 'interview'`

---

## 3. File Inventory

### 3.1 Pages

| File | Lines | Role |
|------|-------|------|
| `app/koala/chat/page.tsx` | 1,760 | Main chat interface (client component) |

### 3.2 Chat UI Components (`app/koala/components/chat/`)

| File | Lines | Role |
|------|-------|------|
| `ColdEmailCard.tsx` | 789 | Cold email display with match scores, edit/send, watermark |
| `CVPreviewCard.tsx` | 303 | CV preview card in chat |
| `ProfileCard.tsx` | 300 | Extracted student profile display + confirm |
| `ProfessorPreviewCard.tsx` | 144 | Professor match card with research alignment |
| `FeedbackCard.tsx` | 122 | Per-message rating (helpful/partial/unhelpful/correction) |
| `UpgradePrompt.tsx` | 76 | Credit depletion upgrade prompt |

### 3.3 Ola Assistant Components (`app/koala/components/ola/`)

| File | Lines | Role |
|------|-------|------|
| `ChatHistorySidebar.tsx` | 172 | Session history navigation |
| `OlaTriggerEngine.tsx` | 187 | Context-based proactive response triggers |
| `OlaAchievements.tsx` | 100 | Achievement badge display |
| `OlaCelebration.tsx` | 94 | Milestone celebration animation |
| `OlaRatingPrompt.tsx` | 90 | Conversation quality rating prompt |
| `OlaProactiveBubble.tsx` | 70 | Proactive message bubbles |
| `OlaAvatar.tsx` | 48 | Ola avatar (koala) |
| `OlaHandoffCard.tsx` | 47 | Transfer to human advisor card |
| `OlaWelcome.tsx` | 40 | New conversation welcome |
| `OlaLoading.tsx` | 32 | Message generation loading state |
| `OlaEmpty.tsx` | 28 | Empty state view |
| `OlaWidget.tsx` | 20 | Widget wrapper |

### 3.4 API Routes

| Endpoint | File | Lines | Role |
|----------|------|-------|------|
| `POST /api/ai/chat` | `app/api/ai/chat/route.ts` | 989 | Core chat endpoint (Claude + tools) |
| `POST /api/ai/feedback` | `app/api/ai/feedback/route.ts` | 34 | AI message feedback |
| `POST /api/ai/export` | `app/api/ai/export/route.ts` | — | Conversation export |
| `POST /api/chat/extract-profile` | `app/api/chat/extract-profile/route.ts` | 33 | Profile extraction from text |
| `POST /api/chat/generate-cold-email` | `app/api/chat/generate-cold-email/route.ts` | 65 | Single cold email generation |
| `POST /api/chat/generate-cold-emails-batch` | `app/api/chat/generate-cold-emails-batch/route.ts` | 119 | Batch cold email generation |
| `POST /api/chat/generate-follow-up` | `app/api/chat/generate-follow-up/route.ts` | 174 | Follow-up email generation |
| `GET /api/chat/professor-preview` | `app/api/chat/professor-preview/route.ts` | 156 | Professor preview data |
| `POST /api/chat/feedback` | `app/api/chat/feedback/route.ts` | 40 | Chat feedback recording |
| `GET /api/user/chat-summary` | `app/api/user/chat-summary/route.ts` | 43 | User conversation stats |

### 3.5 System Prompts (`app/lib/prompts/`)

| File | Lines | Role |
|------|-------|------|
| `system.ts` | 85 | Global system prompt: brand voice, red lines, profiling rules |
| `ola-persona.ts` | 96 | Ola persona: personality, language, monetization triggers |
| `path-assessment.ts` | 77 | PhD pathway assessment mode |
| `research-dive.ts` | 75 | RAG-powered research mode |
| `writing.ts` | 88 | Academic writing mode |
| `interview.ts` | 35 | Interview prep mode |
| `rp.ts` | 33 | Research proposal mode |
| `companion.ts` | 33 | Companion/chat mode |
| `email.ts` | 63 | Cold email generation template |
| `index.ts` | 54 | Mode-to-prompt mapping, `buildSystemPrompt()`, `describeUserStyle()` |

### 3.6 Services & Libraries

| File | Lines | Role |
|------|-------|------|
| `app/lib/services/memoryService.ts` | 437 | Memory extraction (8 categories), load/save/sync to profile |
| `app/lib/services/coldEmailService.ts` | 315 | Cold email generation with professor/student summaries |
| `app/lib/services/usageTracker.ts` | 196 | Daily/monthly usage quota tracking |
| `app/lib/chat/extract-profile.ts` | 89 | Claude Haiku profile extraction from free text |
| `app/lib/ola/ola-session.ts` | 66 | Session lifecycle (upsert/status update) |
| `app/lib/ola/ola-milestones.ts` | 147 | Gamification milestones + credit rewards |
| `app/lib/ola/ola-faq.ts` | 103 | FAQ semantic matching engine |
| `app/lib/ola/ola-emotion.ts` | 30 | Emotion detection (anxious/frustrated) |
| `app/lib/ola/ola-deadlines.ts` | 49 | PhD application deadline context |
| `app/lib/ola/ola-events.ts` | 31 | Analytics event recording |

### 3.7 Type Definitions (`app/lib/types.ts`)

Key chat-related types:

```typescript
ChatMessage       { role: 'user'|'assistant', content: string }
ChatRequest       { mode, messages, professorContext?, userStyleProfile? }
ChatResponse      { reply, citations?, matchedProfessors?, scoreCard?, suggestConsultation?, achievement? }
AIConversation    { id, userId, sessionId, mode, messages[], studentProfileSnapshot, timestamps }
Feedback          { id, conversationId, messageIndex, rating, correctionText?, mode }
UserStyleProfile  { sentenceLength, formality, usesEmoji, expertise, emotionalState }
ProfessorMatch    { professorId, name, institution, matchScore, reason, latestPapers?, ... }
StudentProfile    { degreeLevel, major, gpa, university, researchInterests[], targetDegree, ... }
ExtractedProfile  { name?, university?, major?, research_interests?[], english_level?, ... }
ScoreCard         { totalScore, dimensions: { name, score }[] }
OutreachEmail     { id, professorId, subjectLine, emailBody, followupBody, status, creditsUsed }
```

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Conversation storage (jsonb messages array)
ai_conversations (
  id                        uuid PK,
  user_id                   uuid,
  session_id                text NOT NULL,
  mode                      text NOT NULL,
  messages                  jsonb NOT NULL DEFAULT '[]',
  student_profile_snapshot  jsonb,
  created_at                timestamptz,
  updated_at                timestamptz
)
-- Indexes: session_id, user_id

-- Per-message feedback
feedback (
  id                uuid PK,
  conversation_id   uuid FK → ai_conversations,
  message_index     integer NOT NULL,
  rating            text NOT NULL,  -- 'helpful'|'partial'|'unhelpful'|'correction'
  correction_text   text,
  mode              text NOT NULL,
  created_at        timestamptz
)

-- Session metadata
ola_sessions (
  id                uuid PK,
  session_id        text UNIQUE,
  user_id           uuid,
  mode              text,
  status            text,  -- 'active'|'completed'|'abandoned'
  message_count     integer,
  first_message_at  timestamptz,
  last_message_at   timestamptz,
  metadata          jsonb
)

-- Long-term user memories (extracted from conversations)
user_memories (
  id                        uuid PK,
  user_id                   uuid,
  memory_text               text,
  category                  text,  -- 9 categories (see below)
  confidence                float, -- 0.6–1.0
  source_conversation_id    uuid,
  is_active                 boolean,
  created_at / updated_at   timestamptz
)
```

### 4.2 Supporting Tables

- `user_credits` — credit balance, subscription tier, purchase/usage totals
- `user_profiles` — normalized student background (synced from memories)
- `ola_milestones` — milestone definitions
- `user_milestones` — per-user milestone achievement records
- `cold_emails` — generated email records
- `user_achievements` / `daily_tasks` — gamification

### 4.3 Migrations

| File | Content |
|------|---------|
| `supabase/schema.sql` | Full schema (ai_conversations, feedback, user_credits, etc.) |
| `supabase/chat-messages.sql` | Legacy chat_messages table |
| `supabase/migrations/20260524_rls_user_data_tables.sql` | RLS policies for conversation tables |
| `supabase/migrations/20260523_cold_emails_and_usage_tracking.sql` | Usage tracking tables |
| `supabase/migrations/20260524_professor_postings_and_feedback.sql` | Feedback & professor tables |

---

## 5. Key Data Flows

### 5.1 Message Send Flow

```
User types message
  → page.tsx: callApi()
  → POST /api/ai/chat { mode, messages[], sessionId, userId? }
  → route.ts:
      1. detectIntent(lastMessage)
      2. buildSystemPrompt(mode) + loadMemories(userId) + detectEmotion()
      3. Claude tool-use loop (claude-sonnet-4-6, max 3 iterations)
         └─ if tool_use "searchProfessors" → searchProfessorsForAI() → return results
      4. extractAllBlocks(reply) → scoreCard, professors, email, quickReplies
      5. cleanReply(text)
  → Response { reply, matchedProfessors?, emailPackage?, citations?, scoreCard?, suggestions? }
  → page.tsx: append Message to state, render cards
```

### 5.2 Memory System Flow

```
Every 5 user messages (or first message):
  → extractAndSaveMemories(userId, messages)
  → Claude Haiku extracts facts → Array<{ memory_text, category, confidence }>
  → saveMemories(): upsert to user_memories (conflict detection per category)
  → syncToProfile(): Claude Haiku synthesizes memories → update user_profiles

Next conversation:
  → loadMemories(userId) → formatMemoriesForPrompt()
  → Appended to system prompt as "你对这个用户已有的了解"
```

**9 Memory Categories:** education, academic, research, publication, preference, personal, experience, skill, language

### 5.3 Cold Email Flow

```
User requests outreach email (in chat or via batch endpoint)
  → /api/chat/generate-cold-email or /api/chat/generate-cold-emails-batch
  → coldEmailService.ts:
      1. buildStudentSummary(profile)
      2. buildProfessorSummary(prof, papers, grants)
      3. Claude generates personalized email
  → Response: { subject, body, highlights, matchScores, creditsUsed }
  → ColdEmailCard renders with edit/send/regenerate
```

### 5.4 Profile Extraction Flow

```
Parallel to main chat (in callApi):
  → POST /api/chat/extract-profile { text: userMessage }
  → extract-profile.ts: Claude Haiku → ExtractedProfile
  → page.tsx: ProfileCard shown if data extracted
  → User confirms → profile saved to user_profiles
```

### 5.5 Emotion Detection Flow

```
route.ts receives message
  → detectEmotion(lastMessage) checks keyword lists:
      anxious: 焦虑, 压力大, 崩溃, worried, scared, panic ...
      frustrated: 没用, 放弃, 搞不定, hopeless, give up ...
  → getEmotionPromptSuffix() appended to system prompt:
      anxious → "请用温暖安抚的语气回复，放慢节奏，分享正面案例"
      frustrated → "请先共情再建议，提供具体可操作的下一步"
```

---

## 6. Prompt Architecture

```
Final System Prompt =
  GLOBAL_SYSTEM_PROMPT (system.ts, 85L)
    — Identity: 考拉学长, researcher who studied in Australia
    — Red lines: no guaranteed admission, no fabricated data
    — Student profiling rules
  + "---"
  + MODE_PROMPT (mode-specific file)
    — Mode-specific behavior and output format
  + OLA_PERSONA (ola-persona.ts, 96L)
    — Personality, emoji rules, language detection
    — Revenue triggers (max 2 per conversation)
    — Competitor positioning
  + MEMORY_CONTEXT (formatted memories)
    — "你对这个用户已有的了解（来自历史对话的模糊记忆）"
  + EMOTION_SUFFIX (if detected)
    — Tone adjustment directive
  + USER_STYLE (if available)
    — Match user's sentence length, formality, emoji, expertise level
  + DEADLINE_CONTEXT (if available)
    — Relevant application deadlines
  + PROFESSOR_CONTEXT (if from professor detail page)
    — Professor data for contextual conversation
```

---

## 7. Tool Definitions (Claude Function Calling)

### searchProfessors

Used in modes: path, chat, write, rp, interview (not research — research uses direct RAG).

```typescript
{
  name: "searchProfessors",
  input_schema: {
    researchArea: string,           // required, comma-separated keywords
    university?: string,
    universityGroup?: 'Go8' | 'ATN' | 'IRU',
    scholarshipRequired?: boolean,
    limit?: number                  // default 8, max 15
  }
}
```

Execution: `searchProfessorsForAI()` → Supabase query → `fetchLatestPapersForProfessors()` → formatted result.

---

## 8. Models Used

| Model | Usage |
|-------|-------|
| `claude-sonnet-4-6` | Main chat (all 6 modes), cold email generation |
| `claude-haiku-4-5-20251001` | Profile extraction, memory extraction, memory-to-profile synthesis |

---

## 9. Frontend Component Props

### ColdEmailCard

```typescript
{
  subject: string;
  body: string;
  highlights: { text: string; type: 'student' | 'professor' }[];
  matchScores: { researchAlignment, backgroundFit, researchReadiness, opportunity, overall: number };
  creditsUsed: number;
  creditsRemaining: number;
  onRegenerate: () => void;
  coldEmailId?: string;
  professorId?: string;
  professorName?: string;
  professorEmail?: string;
  userPlan?: string;
  sentAt?: string | null;
  sentVia?: string | null;
}
```

### FeedbackCard

```typescript
{
  conversationId: string;
  onDismiss: () => void;
}
// Question pool: helpfulness, tone, recommend, match_accuracy, improvement, confusion
```

### ChatHistorySidebar

```typescript
{
  currentMode: string;
  isOpen: boolean;
  onClose: () => void;
  onSwitchMode: (mode: string) => void;
  onNewConversation: () => void;
}
// Session data: mode, messageCount, lastMessageAt, firstUserMessage
```

---

## 10. Statistics

| Category | Count |
|----------|-------|
| Chat-related files | 38 |
| API routes | 10 |
| UI components (chat cards) | 6 |
| UI components (Ola assistant) | 12 |
| System prompt files | 10 |
| Service/library files | 10 |
| Database tables (core) | 4 (ai_conversations, feedback, ola_sessions, user_memories) |
| Database tables (supporting) | 6+ (user_credits, user_profiles, cold_emails, milestones, etc.) |
| AI modes | 6 |
| Memory categories | 9 |
| Total lines (estimated) | ~6,500 |
