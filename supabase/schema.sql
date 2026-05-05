-- Koala PhD — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Requires: pgvector extension

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─────────────────────────────────────────────
-- B-END: Core data tables
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professors (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  university                TEXT NOT NULL,
  faculty                   TEXT,
  title                     TEXT,
  position_title            TEXT CHECK (position_title IN (
                              'Professor', 'Associate Professor', 'Senior Lecturer',
                              'Lecturer', 'Research Fellow', 'Senior Research Fellow',
                              'Postdoctoral Fellow'
                            )),
  research_areas            TEXT[] NOT NULL DEFAULT '{}',
  email                     TEXT,
  profile_url               TEXT,
  google_scholar_url        TEXT,
  linkedin_url              TEXT,
  lab_url                   TEXT,
  grant_status              TEXT NOT NULL DEFAULT 'Pending'
                              CHECK (grant_status IN ('Active', 'Pending', 'Inactive')),
  suitable_student_backgrounds TEXT[] NOT NULL DEFAULT '{}',
  potential_rp_topics       TEXT[] NOT NULL DEFAULT '{}',
  "references"              TEXT,
  verification_status       TEXT NOT NULL DEFAULT 'Pending'
                              CHECK (verification_status IN ('Verified', 'Pending', 'Rejected')),
  -- Data pipeline
  source_candidate_id       TEXT,
  arc_project_ids           TEXT[],
  semantic_scholar_id       TEXT,
  h_index                   INTEGER,
  paper_count               INTEGER,
  citation_count            INTEGER,
  accepting_students        TEXT CHECK (accepting_students IN ('yes', 'no', 'unknown')),
  data_sources              TEXT[],
  last_synced_at            TIMESTAMPTZ,
  -- Opportunity Signal
  opportunity_score         INTEGER DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  opportunity_breakdown     JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS grants (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grant_name                    TEXT NOT NULL,
  funding_body                  TEXT NOT NULL,
  arc_project_id                TEXT,
  year                          TEXT NOT NULL,
  amount                        TEXT,
  lead_professor                TEXT NOT NULL,
  lead_professor_id             UUID REFERENCES professors(id) ON DELETE SET NULL,
  university                    TEXT NOT NULL,
  industry_partner              TEXT,
  project_title                 TEXT NOT NULL,
  project_abstract              TEXT,
  keywords                      TEXT[] NOT NULL DEFAULT '{}',
  phd_relevance                 TEXT NOT NULL DEFAULT 'Medium'
                                  CHECK (phd_relevance IN ('High', 'Medium', 'Low')),
  industry_scholarship_potential TEXT NOT NULL DEFAULT 'Medium'
                                  CHECK (industry_scholarship_potential IN ('High', 'Medium', 'Low')),
  reference_url                 TEXT,
  verification_status           TEXT NOT NULL DEFAULT 'Pending'
                                  CHECK (verification_status IN ('Verified', 'Pending', 'Rejected')),
  source_candidate_id           TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS topics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  research_field        TEXT,
  related_professor_ids UUID[],
  related_grant_ids     UUID[],
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_cards (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Draft'
                        CHECK (status IN ('Draft', 'Pending', 'Approved', 'Published', 'Archived')),
  source_type         TEXT CHECK (source_type IN (
                        'Professor', 'Grant', 'Research Topic',
                        'Student Case', 'Research Proposal', 'University Guide'
                      )),
  source_entity_id    UUID,
  xiaohongshu_post    TEXT,
  xiaohongshu_carousel TEXT,
  wechat_moment       TEXT,
  website_article     TEXT,
  linkedin_post       TEXT,
  image_prompt        TEXT,
  reference           TEXT,
  compliance_check    TEXT,
  generated_by        TEXT CHECK (generated_by IN ('AI', 'Manual')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS publishing_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform          TEXT NOT NULL CHECK (platform IN (
                      'Xiaohongshu', 'WeChat', 'Website',
                      'LinkedIn', 'Douyin', 'Instagram'
                    )),
  content_title     TEXT NOT NULL,
  publish_date      TEXT NOT NULL,
  publish_url       TEXT NOT NULL,
  views             INTEGER NOT NULL DEFAULT 0,
  likes             INTEGER NOT NULL DEFAULT 0,
  saves             INTEGER NOT NULL DEFAULT 0,
  comments          INTEGER NOT NULL DEFAULT 0,
  dms               INTEGER NOT NULL DEFAULT 0,
  wechat_adds       INTEGER NOT NULL DEFAULT 0,
  consultations     INTEGER NOT NULL DEFAULT 0,
  conversion_notes  TEXT,
  content_card_id   UUID REFERENCES content_cards(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              TEXT NOT NULL CHECK (source IN (
                        'arc', 'semantic_scholar', 'uni_website', 'linkedin', 'manual'
                      )),
  status              TEXT NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  professors_added    INTEGER NOT NULL DEFAULT 0,
  professors_updated  INTEGER NOT NULL DEFAULT 0,
  errors              TEXT[] NOT NULL DEFAULT '{}',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- Shared: Sensitive words (Admin-maintained)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensitive_words (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word        TEXT NOT NULL UNIQUE,
  replacement TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'all',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- C-END: RAG Knowledge base (pgvector)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type   TEXT NOT NULL CHECK (source_type IN (
                  'professor_paper', 'arc_grant', 'blog_post', 'faq', 'user_feedback'
                )),
  source_title  TEXT NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- C-END: Blog
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN (
                    'phd-guide', 'professor-spotlight', 'grant-news',
                    'student-story', 'visa-study', 'research-skills', 'industry-phd'
                  )),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  cover_image     TEXT,
  author_name     TEXT NOT NULL DEFAULT 'Koala PhD',
  content_card_id UUID REFERENCES content_cards(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- C-END: AI conversations & feedback
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID,
  session_id                TEXT NOT NULL,
  mode                      TEXT NOT NULL CHECK (mode IN ('path', 'research', 'chat', 'write')),
  messages                  JSONB NOT NULL DEFAULT '[]',
  student_profile_snapshot  JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_conversations_session_idx ON ai_conversations (session_id);
CREATE INDEX IF NOT EXISTS ai_conversations_user_idx ON ai_conversations (user_id);

CREATE TABLE IF NOT EXISTS feedback (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  message_index     INTEGER NOT NULL,
  rating            TEXT NOT NULL CHECK (rating IN ('helpful', 'partial', 'unhelpful', 'correction')),
  correction_text   TEXT,
  mode              TEXT NOT NULL CHECK (mode IN ('path', 'research', 'chat', 'write')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- C-END: Credits, subscriptions, outreach
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_credits (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL UNIQUE,
  credit_balance              INTEGER NOT NULL DEFAULT 1,
  subscription_tier           TEXT CHECK (subscription_tier IN ('basic', 'pro', 'premium')),
  subscription_monthly_credits INTEGER NOT NULL DEFAULT 0,
  subscription_expires_at     TIMESTAMPTZ,
  total_credits_purchased     INTEGER NOT NULL DEFAULT 0,
  total_credits_used          INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_emails (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID,
  professor_id        UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  subject_line        TEXT NOT NULL,
  email_body          TEXT NOT NULL,
  followup_body       TEXT,
  risk_note           TEXT,
  tone                TEXT NOT NULL,
  purpose             TEXT NOT NULL CHECK (purpose IN ('PhD', 'MRes', 'RA', 'Scholarship')),
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'copied', 'sent', 'replied', 'no_reply')),
  credits_used        INTEGER NOT NULL DEFAULT 1,
  was_free            BOOLEAN NOT NULL DEFAULT false,
  sent_at             TIMESTAMPTZ,
  reply_received_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- C-END: Gamification
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL,
  achievement_key TEXT NOT NULL CHECK (achievement_key IN (
                    'first_cv', 'first_match', 'first_email', 'first_reply',
                    'research_angle', 'grant_hunter', 'rp_starter',
                    'outreach_campaign', 'phd_pathway_clear'
                  )),
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL,
  day_number    INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  task_key      TEXT NOT NULL,
  task_title    TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day_number)
);
