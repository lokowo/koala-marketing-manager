const ANXIOUS_KEYWORDS = [
  '焦虑', '压力大', '来不及', '怎么办', '崩溃', '没信心', '害怕', '被拒',
  'anxious', 'stressed', 'worried', 'rejected', 'nervous', 'scared', 'panic',
];

const FRUSTRATED_KEYWORDS = [
  '没用', '不行', '放弃', '搞不定', '太难了', '垃圾',
  'hopeless', 'give up', 'frustrated', 'useless', 'impossible',
];

export function detectEmotion(message: string): 'anxious' | 'frustrated' | null {
  const lower = message.toLowerCase();

  for (const kw of ANXIOUS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'anxious';
  }

  for (const kw of FRUSTRATED_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'frustrated';
  }

  return null;
}

export function getEmotionPromptSuffix(emotion: 'anxious' | 'frustrated'): string {
  if (emotion === 'anxious') {
    return '用户似乎有些焦虑。请用温暖安抚的语气回复，放慢节奏，分享正面案例，给予鼓励。';
  }
  return '用户似乎有些沮丧。请先共情再建议，提供具体可操作的下一步。不要说空话。';
}
