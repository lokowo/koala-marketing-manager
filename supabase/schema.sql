-- Koala PhD — Complete Database Schema
-- Synced from production 2026-05-19
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- B-END: Core data tables
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professors (
  id                          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                        text          NOT NULL,
  university                  text          NOT NULL,
  faculty                     text,
  title                       text,
  position_title              text,
  research_areas              text[]        NOT NULL DEFAULT '{}',
  email                       text,
  profile_url                 text,
  google_scholar_url          text,
  linkedin_url                text,
  lab_url                     text,
  grant_status                text          NOT NULL DEFAULT 'Pending',
  suitable_student_backgrounds text[]       NOT NULL DEFAULT '{}',
  potential_rp_topics         text[]        NOT NULL DEFAULT '{}',
  "references"                text,
  verification_status         text          NOT NULL DEFAULT 'Pending',
  source_candidate_id         text,
  arc_project_ids             text[],
  semantic_scholar_id         text,
  h_index                     integer,
  paper_count                 integer,
  citation_count              integer,
  accepting_students          text,
  data_sources                text[],
  last_synced_at              timestamptz,
  opportunity_score           integer       DEFAULT 0,
  opportunity_breakdown       jsonb,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz,
  research_embedding          vector(1536),
  email_source                text,
  contributed_by              uuid,
  contributed_at              timestamptz,
  reviewed_by                 uuid,
  reviewed_at                 timestamptz,
  ai_bio_zh                   text,
  ai_bio_en                   text,
  ai_bio_generated_at         timestamptz,
  ai_summary                  text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_professors_accepting        ON professors USING btree (accepting_students);
CREATE INDEX IF NOT EXISTS idx_professors_email_source     ON professors USING btree (email_source);
CREATE INDEX IF NOT EXISTS idx_professors_h_index          ON professors USING btree (h_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_professors_name_trgm        ON professors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_professors_opportunity_score ON professors USING btree (opportunity_score DESC NULLS LAST);
CREATE UNIQUE INDEX IF NOT EXISTS idx_professors_unique_name_uni ON professors USING btree (name, university);
CREATE INDEX IF NOT EXISTS idx_professors_university       ON professors USING btree (university);
CREATE INDEX IF NOT EXISTS idx_professors_user_contributed ON professors USING btree (verification_status, contributed_at DESC) WHERE (verification_status = 'user_contributed');

CREATE TABLE IF NOT EXISTS grants (
  id                            uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  grant_name                    text          NOT NULL,
  funding_body                  text          NOT NULL,
  arc_project_id                text,
  year                          text          NOT NULL,
  amount                        text,
  lead_professor                text          NOT NULL,
  lead_professor_id             uuid          REFERENCES professors(id) ON DELETE SET NULL,
  university                    text          NOT NULL,
  industry_partner              text,
  project_title                 text          NOT NULL,
  project_abstract              text,
  keywords                      text[]        NOT NULL DEFAULT '{}',
  phd_relevance                 text          NOT NULL DEFAULT 'Medium',
  industry_scholarship_potential text         NOT NULL DEFAULT 'Medium',
  reference_url                 text,
  verification_status           text          NOT NULL DEFAULT 'Pending',
  source_candidate_id           text,
  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz
);

CREATE TABLE IF NOT EXISTS papers (
  id                    uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id          uuid          REFERENCES professors(id),
  title                 text          NOT NULL,
  year                  integer,
  journal               text,
  citation_count        integer       DEFAULT 0,
  doi                   text,
  semantic_scholar_id   text          UNIQUE,
  semantic_scholar_url  text,
  abstract              text,
  source                text          DEFAULT 'Semantic Scholar',
  last_synced           timestamptz   DEFAULT now(),
  created_at            timestamptz   DEFAULT now(),
  doi_url               text,
  ss_url                text
);

CREATE INDEX IF NOT EXISTS idx_papers_professor ON papers USING btree (professor_id);
CREATE INDEX IF NOT EXISTS idx_papers_year      ON papers USING btree (year DESC);

CREATE TABLE IF NOT EXISTS saved_professors (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL,
  professor_id    uuid          REFERENCES professors(id),
  notes           text,
  created_at      timestamptz   DEFAULT now(),
  UNIQUE (user_id, professor_id)
);

CREATE TABLE IF NOT EXISTS professor_interactions (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid          NOT NULL,
  professor_id      uuid          NOT NULL REFERENCES professors(id),
  interaction_type  text          NOT NULL,
  notes             text,
  created_at        timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_interact_type ON professor_interactions USING btree (interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prof_interact_user ON professor_interactions USING btree (user_id, professor_id);

CREATE TABLE IF NOT EXISTS topics (
  id                    uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text          NOT NULL,
  description           text          NOT NULL,
  research_field        text,
  related_professor_ids uuid[],
  related_grant_ids     uuid[],
  created_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_cards (
  id                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               text          NOT NULL,
  status              text          NOT NULL DEFAULT 'Draft',
  source_type         text,
  source_entity_id    uuid,
  xiaohongshu_post    text,
  xiaohongshu_carousel text,
  wechat_moment       text,
  website_article     text,
  linkedin_post       text,
  image_prompt        text,
  reference           text,
  compliance_check    text,
  generated_by        text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE TABLE IF NOT EXISTS publishing_items (
  id                uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform          text          NOT NULL,
  content_title     text          NOT NULL,
  publish_date      text          NOT NULL,
  publish_url       text          NOT NULL,
  views             integer       NOT NULL DEFAULT 0,
  likes             integer       NOT NULL DEFAULT 0,
  saves             integer       NOT NULL DEFAULT 0,
  comments          integer       NOT NULL DEFAULT 0,
  dms               integer       NOT NULL DEFAULT 0,
  wechat_adds       integer       NOT NULL DEFAULT 0,
  consultations     integer       NOT NULL DEFAULT 0,
  conversion_notes  text,
  content_card_id   uuid          REFERENCES content_cards(id) ON DELETE SET NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              text          NOT NULL,
  status              text          NOT NULL DEFAULT 'running',
  professors_added    integer       NOT NULL DEFAULT 0,
  professors_updated  integer       NOT NULL DEFAULT 0,
  errors              text[]        NOT NULL DEFAULT '{}',
  started_at          timestamptz   NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

-- ─────────────────────────────────────────────
-- Shared: Sensitive words (Admin-maintained)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensitive_words (
  id          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  word        text          NOT NULL UNIQUE,
  replacement text          NOT NULL,
  platform    text          NOT NULL DEFAULT 'all',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- C-END: RAG Knowledge base (pgvector)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id            uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type   text          NOT NULL,
  source_title  text          NOT NULL,
  content       text          NOT NULL,
  embedding     vector(1536),
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- C-END: Blog
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id              uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            text          NOT NULL UNIQUE,
  title           text          NOT NULL,
  excerpt         text          NOT NULL,
  content         text          NOT NULL,
  category        text          NOT NULL,
  tags            text[]        NOT NULL DEFAULT '{}',
  cover_image     text,
  author_name     text          NOT NULL DEFAULT 'Koala PhD',
  content_card_id uuid          REFERENCES content_cards(id) ON DELETE SET NULL,
  status          text          NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

-- ─────────────────────────────────────────────
-- C-END: AI conversations & feedback
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id                        uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   uuid,
  session_id                text          NOT NULL,
  mode                      text          NOT NULL,
  messages                  jsonb         NOT NULL DEFAULT '[]',
  student_profile_snapshot  jsonb,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz
);

CREATE INDEX IF NOT EXISTS ai_conversations_session_idx ON ai_conversations (session_id);
CREATE INDEX IF NOT EXISTS ai_conversations_user_idx ON ai_conversations (user_id);

CREATE TABLE IF NOT EXISTS feedback (
  id                uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   uuid          REFERENCES ai_conversations(id) ON DELETE SET NULL,
  message_index     integer       NOT NULL,
  rating            text          NOT NULL,
  correction_text   text,
  mode              text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- C-END: Credits, subscriptions, outreach
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_credits (
  id                          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     uuid          NOT NULL UNIQUE,
  credit_balance              integer       NOT NULL DEFAULT 1,
  subscription_tier           text,
  subscription_monthly_credits integer      NOT NULL DEFAULT 0,
  subscription_expires_at     timestamptz,
  total_credits_purchased     integer       NOT NULL DEFAULT 0,
  total_credits_used          integer       NOT NULL DEFAULT 0,
  created_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_emails (
  id                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid,
  professor_id        uuid          NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  subject_line        text          NOT NULL,
  email_body          text          NOT NULL,
  followup_body       text,
  risk_note           text,
  tone                text          NOT NULL,
  purpose             text          NOT NULL,
  status              text          NOT NULL DEFAULT 'draft',
  credits_used        integer       NOT NULL DEFAULT 1,
  was_free            boolean       NOT NULL DEFAULT false,
  sent_at             timestamptz,
  reply_received_at   timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- C-END: Gamification
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_achievements (
  id              uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid          NOT NULL,
  achievement_key text          NOT NULL,
  unlocked_at     timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id            uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid          NOT NULL,
  day_number    integer       NOT NULL,
  task_key      text          NOT NULL,
  task_title    text          NOT NULL,
  completed     boolean       NOT NULL DEFAULT false,
  completed_at  timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_number)
);
