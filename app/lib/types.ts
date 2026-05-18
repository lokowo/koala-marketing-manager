// Canonical type definitions for all Koala entities.
// B-end (dashboard) and C-end (frontend) share this file.

import type { AIMode } from './constants';

// ─────────────────────────────────────────────
// B-END: Core data entities (backend dashboard)
// ─────────────────────────────────────────────

export interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string;
  title: string;
  // position_title uses real academic rank, never just "教授"
  positionTitle?: 'Professor' | 'Associate Professor' | 'Senior Lecturer' | 'Lecturer' | 'Research Fellow' | 'Senior Research Fellow' | 'Postdoctoral Fellow';
  researchAreas: string[];
  email: string;
  profileUrl: string;
  googleScholarUrl: string;
  linkedinUrl?: string;
  labUrl?: string;
  grantStatus: 'Active' | 'Pending' | 'Inactive';
  suitableStudentBackgrounds: string[];
  potentialRpTopics: string[];
  references: string;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected' | 'Merged' | 'user_contributed';
  contributedBy?: string;
  contributedAt?: string;
  // Data pipeline fields
  sourceCandidateId?: string;
  arcProjectIds?: string[];
  semanticScholarId?: string;
  hIndex?: number;
  paperCount?: number;
  citationCount?: number;
  acceptingStudents?: 'yes' | 'no' | 'unknown' | 'likely';
  dataSources?: Array<'arc' | 'semantic_scholar' | 'uni_website' | 'linkedin' | 'manual'>;
  lastSyncedAt?: string;
  // Opportunity Signal (auto-calculated, 0-100)
  opportunityScore?: number;
  opportunityBreakdown?: {
    career: number;
    grant: number;
    interdisciplinary: number;
    publication: number;
    explicit: number;
  };
  aiSummary?: string;
  // Extended matching fields
  supervisionStyle?: string;
  labSize?: string;
  chineseFriendly?: boolean;
  industryConnections?: string;
  recentGraduates?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Grant {
  id: string;
  grantName: string;
  fundingBody: string;
  arcProjectId?: string;
  year: string;
  amount: string;
  leadProfessor: string;
  leadProfessorId?: string;
  university: string;
  industryPartner: string;
  projectTitle: string;
  projectAbstract: string;
  keywords: string[];
  phdRelevance: 'High' | 'Medium' | 'Low';
  industryScholarshipPotential: 'High' | 'Medium' | 'Low';
  referenceUrl: string;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected';
  sourceCandidateId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  researchField?: string;
  relatedProfessorIds?: string[];
  relatedGrantIds?: string[];
  createdAt?: string;
}

export interface PublishingItem {
  id: string;
  platform: 'Xiaohongshu' | 'WeChat' | 'Website' | 'LinkedIn' | 'Douyin' | 'Instagram';
  contentTitle: string;
  publishDate: string;
  publishUrl: string;
  views: number;
  likes: number;
  saves: number;
  comments: number;
  dms: number;
  wechatAdds: number;
  consultations: number;
  conversionNotes: string;
  contentCardId?: string;
  createdAt?: string;
}

export interface ContentCard {
  id: string;
  title: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Published' | 'Archived';
  sourceType?: 'Professor' | 'Grant' | 'Research Topic' | 'Student Case' | 'Research Proposal' | 'University Guide';
  sourceEntityId?: string;
  xiaohongshuPost?: string;
  xiaohongshuCarousel?: string;
  wechatMoment?: string;
  websiteArticle?: string;
  linkedinPost?: string;
  imagePrompt?: string;
  reference?: string;
  complianceCheck?: string;
  generatedBy?: 'AI' | 'Manual';
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Done';
}

export type CandidateType = 'Professor' | 'Grant' | 'Scholarship' | 'Research Topic';
export type CandidateStatus = 'Pending' | 'Approved' | 'Rejected' | 'Saved';

export interface DiscoveryCandidate {
  id: string;
  type: CandidateType;
  title: string;
  university: string;
  sourceUrl: string;
  summary: string;
  confidenceScore: number;
  status: CandidateStatus;
  researchField: string;
  savedEntityId?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────
// C-END: AI chat and student-facing types
// ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserStyleProfile {
  sentenceLength: 'short' | 'medium' | 'long';
  formality: 'casual' | 'mixed' | 'formal';
  usesEmoji: boolean;
  expertise: 'beginner' | 'intermediate' | 'expert';
  emotionalState: 'anxious' | 'neutral' | 'motivated';
}

export interface ProfessorContext {
  professorId: string;
  name: string;
  institution: string;
  researchTags: string[];
}

export interface ChatRequest {
  mode: AIMode;
  messages: ChatMessage[];
  professorContext?: ProfessorContext;
  userStyleProfile?: UserStyleProfile;
}

export interface PaperCitation {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  url: string;
}

export interface ProfessorMatch {
  professorId: string;
  name: string;
  institution: string;
  positionTitle?: string;
  matchScore: number;
  reason: string;
  opportunityLabel?: string;
  researchTags?: string[];
  hIndex?: number;
  paperCount?: number;
  citationCount?: number;
}

export interface ScoreCardDimension {
  name: string;
  score: number;
}

export interface ScoreCard {
  totalScore: number;
  dimensions: ScoreCardDimension[];
}

export interface ChatResponse {
  reply: string;
  citations?: PaperCitation[];
  matchedProfessors?: ProfessorMatch[];
  scoreCard?: ScoreCard;
  suggestConsultation?: boolean;
  achievement?: string;
}

// ─────────────────────────────────────────────
// C-END: Student profile (AI-extracted)
// ─────────────────────────────────────────────

export interface StudentProfile {
  userId?: string;
  // Background
  degreeLevel: 'Bachelor' | 'Master' | 'PhD' | 'Other';
  major: string;
  gpa?: number;
  gpaScale?: number;
  university?: string;
  graduationYear?: number;
  // Research experience
  hasResearchExperience: boolean;
  researchSummary?: string;
  publications?: number;
  // Skills (extracted from CV)
  technicalSkills: string[];
  programmingLanguages?: string[];
  // Interests
  researchInterests: string[];
  targetDegree: 'MRes' | 'PhD' | 'Either';
  targetField?: string;
  // Application readiness
  readinessScore?: number;
  strengths?: string[];
  gaps?: string[];
  extractedAt?: string;
}

// ─────────────────────────────────────────────
// C-END: Outreach email system
// ─────────────────────────────────────────────

export interface OutreachEmailRequest {
  professorId: string;
  studentProfile: StudentProfile;
  tone: 'professional' | 'warm' | 'direct' | 'academic';
  purpose: 'PhD' | 'MRes' | 'RA' | 'Scholarship';
}

export interface OutreachEmail {
  id: string;
  userId?: string;
  professorId: string;
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
  tone: string;
  purpose: string;
  status: 'draft' | 'copied' | 'sent' | 'replied' | 'no_reply';
  creditsUsed: number;
  wasFree: boolean;
  sentAt?: string;
  replyReceivedAt?: string;
  createdAt: string;
}

export interface OutreachGenerateResponse {
  emailId: string;
  subjectLine: string;
  emailBody: string;
  followupBody: string;
  riskNote: string;
  creditsUsed: number;
  remainingCredits: number;
}

// ─────────────────────────────────────────────
// C-END: Credits & subscription
// ─────────────────────────────────────────────

export type SubscriptionTier = 'basic' | 'pro' | 'premium';

export interface UserCredits {
  id: string;
  userId: string;
  creditBalance: number;
  subscriptionTier?: SubscriptionTier;
  subscriptionMonthlyCredits: number;
  subscriptionExpiresAt?: string;
  totalCreditsPurchased: number;
  totalCreditsUsed: number;
  createdAt: string;
}

// ─────────────────────────────────────────────
// C-END: Gamification
// ─────────────────────────────────────────────

export type AchievementKey =
  | 'first_cv'
  | 'first_match'
  | 'first_email'
  | 'first_reply'
  | 'research_angle'
  | 'grant_hunter'
  | 'rp_starter'
  | 'outreach_campaign'
  | 'phd_pathway_clear';

export interface UserAchievement {
  id: string;
  userId: string;
  achievementKey: AchievementKey;
  unlockedAt: string;
}

export interface DailyTask {
  id: string;
  userId: string;
  dayNumber: number;
  taskKey: string;
  taskTitle: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// C-END: RAG knowledge base
// ─────────────────────────────────────────────

export interface KnowledgeChunk {
  id: string;
  sourceType: 'professor_paper' | 'arc_grant' | 'blog_post' | 'faq' | 'user_feedback' | 'guide' | 'professor_profile' | 'manual';
  sourceTitle: string;
  content: string;
  embedding?: number[];
  similarity?: number;
  createdAt?: string;
}

// ─────────────────────────────────────────────
// C-END: Blog
// ─────────────────────────────────────────────

export type BlogCategory =
  | 'phd-guide'
  | 'professor-spotlight'
  | 'grant-news'
  | 'student-story'
  | 'visa-study'
  | 'research-skills'
  | 'industry-phd';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  coverImage?: string;
  authorName: string;
  contentCardId?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
// C-END: AI conversation history
// ─────────────────────────────────────────────

export interface AIConversation {
  id: string;
  userId?: string;
  sessionId: string;
  mode: AIMode;
  messages: ChatMessage[];
  studentProfileSnapshot?: StudentProfile;
  createdAt: string;
  updatedAt?: string;
}

export interface Feedback {
  id: string;
  conversationId?: string;
  messageIndex: number;
  rating: 'helpful' | 'partial' | 'unhelpful' | 'correction';
  correctionText?: string;
  mode: AIMode;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Shared: Pipeline (replaces Discovery mock)
// ─────────────────────────────────────────────

export type PipelineSource = 'arc' | 'semantic_scholar' | 'uni_website' | 'linkedin' | 'manual';
export type PipelineStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface PipelineRun {
  id: string;
  source: PipelineSource;
  status: PipelineStatus;
  professorsAdded: number;
  professorsUpdated: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}
