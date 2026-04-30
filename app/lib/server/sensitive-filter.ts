// Sensitive word filter — words loaded from DB in production
// Hardcoded fallback list covers core compliance requirements

const FORBIDDEN_PHRASES = [
  '保录取', '保奖学金', '保签证', '100%成功率', '100% 成功率',
  '名额有限', '最后几个名额', '内推', '内部关系', '中介',
  '招生', '买offer', '包过', '必过',
];

const REPLACE_MAP: Record<string, string> = {
  '保录取': '稳妥的申请规划',
  '保奖学金': '提高奖学金获得概率',
  '100%成功率': '较高的申请成功率',
  '中介': '学术顾问团队',
  '招生': '学术匹配',
};

export function filterSensitiveContent(text: string): {
  filtered: string;
  violations: string[];
} {
  const violations: string[] = [];
  let filtered = text;

  for (const phrase of FORBIDDEN_PHRASES) {
    if (filtered.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(phrase);
      const replacement = REPLACE_MAP[phrase];
      if (replacement) {
        filtered = filtered.replace(new RegExp(phrase, 'gi'), replacement);
      }
    }
  }

  return { filtered, violations };
}

export function hasSensitiveContent(text: string): boolean {
  return FORBIDDEN_PHRASES.some(p => text.toLowerCase().includes(p.toLowerCase()));
}

export const XIAOHONGSHU_REPLACE: Record<string, string> = {
  '私信我': '戳我',
  '加微信': '绿色软件',
  '微信': '威',
  '保录取': '稳妥方案',
  '中介': '学长',
  '机构': '过来人',
  '二维码': '看主页',
  '链接': '看主页',
};

export function filterXiaohongshu(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(XIAOHONGSHU_REPLACE)) {
    result = result.replace(new RegExp(from, 'g'), to);
  }
  return result;
}
