export { GLOBAL_SYSTEM_PROMPT, KSA_KNOWLEDGE_BASE } from './system';
export { PATH_ASSESSMENT_PROMPT } from './path-assessment';
export { RESEARCH_DIVE_PROMPT } from './research-dive';
export { COMPANION_PROMPT } from './companion';
export { WRITING_PROMPT } from './writing';
export { RP_PROMPT } from './rp';
export { INTERVIEW_PROMPT } from './interview';
export { EMAIL_GENERATION_PROMPT, buildEmailPrompt } from './email';

import { GLOBAL_SYSTEM_PROMPT } from './system';
import { PATH_ASSESSMENT_PROMPT } from './path-assessment';
import { RESEARCH_DIVE_PROMPT } from './research-dive';
import { COMPANION_PROMPT } from './companion';
import { WRITING_PROMPT } from './writing';
import { RP_PROMPT } from './rp';
import { INTERVIEW_PROMPT } from './interview';

import type { AIMode } from '../constants';

export function getModePrompt(mode: AIMode): string {
  const map: Record<AIMode, string> = {
    path: PATH_ASSESSMENT_PROMPT,
    research: RESEARCH_DIVE_PROMPT,
    chat: COMPANION_PROMPT,
    write: WRITING_PROMPT,
    rp: RP_PROMPT,
    interview: INTERVIEW_PROMPT,
  };
  return map[mode] ?? COMPANION_PROMPT;
}

export function buildSystemPrompt(mode: AIMode, extras?: string): string {
  return GLOBAL_SYSTEM_PROMPT + '\n\n---\n\n' + getModePrompt(mode) + (extras ? '\n\n' + extras : '');
}

export function describeUserStyle(profile: {
  sentenceLength: string;
  formality: string;
  usesEmoji: boolean;
  expertise: string;
  emotionalState: string;
}): string {
  const parts: string[] = [];
  if (profile.sentenceLength === 'short') parts.push('用短句，简洁');
  if (profile.sentenceLength === 'long') parts.push('可以用长句，详细解释');
  if (profile.formality === 'casual') parts.push('语气偏随意，可以用口语');
  if (profile.formality === 'formal') parts.push('语气偏正式');
  if (profile.usesEmoji) parts.push('适当使用 emoji');
  if (profile.expertise === 'beginner') parts.push('用通俗语言解释专业术语');
  if (profile.expertise === 'expert') parts.push('可以使用专业术语，不需要解释基础概念');
  if (profile.emotionalState === 'anxious') parts.push('注意情绪支持，语气要温暖');
  if (profile.emotionalState === 'motivated') parts.push('可以直接讲重点，用户状态很好');
  return parts.join('；');
}
