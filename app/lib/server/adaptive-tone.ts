import type { UserStyleProfile } from '../types';

// Extends the shared UserStyleProfile with language detection (server-only)
export interface UserStyleProfileExtended extends UserStyleProfile {
  language: 'zh' | 'en' | 'mixed';
}

/**
 * Analyse the first 3 user messages and infer communication style.
 * Call this after 3 user turns; pass result back into the next system prompt via styleToPromptSuffix().
 */
export function analyzeUserStyle(
  messages: Array<{ role: string; content: string }>,
): UserStyleProfileExtended {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .slice(0, 3);

  if (userMessages.length === 0) {
    return { sentenceLength: 'medium', formality: 'casual', usesEmoji: false, expertise: 'beginner', emotionalState: 'neutral', language: 'zh' };
  }

  const allText = userMessages.join(' ');
  const avgLength = allText.length / userMessages.length;

  const sentenceLength: UserStyleProfileExtended['sentenceLength'] =
    avgLength < 30 ? 'short' : avgLength > 100 ? 'long' : 'medium';

  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu;
  const usesEmoji = emojiRegex.test(allText);

  const chineseChars = (allText.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = (allText.match(/[a-zA-Z]+/g) ?? []).length;
  const language: UserStyleProfileExtended['language'] =
    chineseChars > englishWords * 2 ? 'zh' :
    englishWords > chineseChars * 2 ? 'en' : 'mixed';

  const casualMarkers = ['哈', '呀', '啊', '嘛', '呢', '吧', '哦', '嗯', '...', '～', 'lol', 'haha'];
  const casualCount = casualMarkers.filter(m => allText.includes(m)).length;
  const formality: UserStyleProfileExtended['formality'] =
    casualCount >= 3 ? 'casual' : casualCount >= 1 ? 'mixed' : 'formal';

  const expertTerms = [
    'h-index', 'Q1', 'SCI', 'impact factor', 'methodology', 'p-value',
    'regression', 'neural network', 'transformer', 'GPA', 'WAM',
    'ARC', 'grant', 'proposal', 'PhD', 'postdoc',
  ];
  const expertCount = expertTerms.filter(t => allText.toLowerCase().includes(t.toLowerCase())).length;
  const expertise: UserStyleProfileExtended['expertise'] =
    expertCount >= 3 ? 'expert' : expertCount >= 1 ? 'intermediate' : 'beginner';

  const anxiousMarkers = ['焦虑', '担心', '害怕', '纠结', '迷茫', '不确定', '压力', '崩溃', '不行', '太难', '没希望', 'anxious', 'worried', 'stress'];
  const motivatedMarkers = ['想要', '准备', '开始', '计划', '决定', '冲', '加油', 'ready', 'excited', 'plan'];
  const anxiousCount = anxiousMarkers.filter(m => allText.includes(m)).length;
  const motivatedCount = motivatedMarkers.filter(m => allText.includes(m)).length;
  const emotionalState: UserStyleProfileExtended['emotionalState'] =
    anxiousCount >= 2 ? 'anxious' : motivatedCount >= 2 ? 'motivated' : 'neutral';

  return { sentenceLength, formality, usesEmoji, expertise, emotionalState, language };
}

/**
 * Convert a style profile into a system-prompt suffix that Claude appends.
 * Returns empty string when no style data is available.
 */
export function styleToPromptSuffix(style: UserStyleProfileExtended): string {
  const lines: string[] = [];

  if (style.sentenceLength === 'short') {
    lines.push('用户习惯发短句，你也要简短干练地回复，不要长篇大论。');
  } else if (style.sentenceLength === 'long') {
    lines.push('用户喜欢详细表述，你可以展开分析，给出更多细节。');
  }

  if (style.formality === 'casual') {
    lines.push('用户语气随意，你也可以适当使用口语化表达，像朋友聊天。');
  } else if (style.formality === 'formal') {
    lines.push('用户语气正式，你也保持专业但友好的语气。');
  }

  if (style.usesEmoji) {
    lines.push('用户使用表情符号，你也可以适当加入（每 2-3 段一个，不过度）。');
  } else {
    lines.push('用户不使用表情符号，你也不要使用。');
  }

  if (style.expertise === 'expert') {
    lines.push('用户有专业背景，可以使用学术术语，不需要过度解释基础概念。');
  } else if (style.expertise === 'beginner') {
    lines.push('用户可能是学术新手，用通俗易懂的语言解释，避免过多专业术语。');
  }

  if (style.emotionalState === 'anxious') {
    lines.push('用户有些焦虑。先表达理解和共情，再给建议，不要否定他的感受。');
  } else if (style.emotionalState === 'motivated') {
    lines.push('用户状态积极，可以直接给出行动建议，节奏快一些。');
  }

  if (style.language === 'zh') {
    lines.push('用中文回复。');
  } else if (style.language === 'en') {
    lines.push('Reply in English.');
  } else {
    lines.push('用户中英混合，你也可以中英混用，专业术语用英文。');
  }

  return lines.length > 0
    ? `\n\n## 用户说话风格（自动检测）\n${lines.join('\n')}\n记住：用户喜欢看到像自己的人。`
    : '';
}
