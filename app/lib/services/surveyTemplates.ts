import type { QuestionType } from './surveyService';

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: Array<{
    type: QuestionType;
    title: string;
    description?: string;
    options?: string[];
    required: boolean;
    config?: Record<string, unknown>;
  }>;
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'phd_interest',
    name: 'PhD 意向调研',
    description: '了解学生的PhD申请意向和背景',
    icon: '🎓',
    questions: [
      { type: 'single_choice', title: '你目前的学历阶段是？', options: ['本科在读', '本科毕业', '硕士在读', '硕士毕业', '其他'], required: true },
      { type: 'single_choice', title: '你计划什么时候开始PhD？', options: ['今年', '明年', '后年', '还没确定'], required: true },
      { type: 'multiple_choice', title: '你感兴趣的研究方向？（可多选）', options: ['AI / Machine Learning', 'Biomedical', 'Engineering', 'Environmental Science', 'Social Science', 'Business / Finance', '其他'], required: true },
      { type: 'multiple_choice', title: '你考虑申请哪些澳洲大学？', options: ['University of Sydney', 'University of Melbourne', 'UNSW', 'ANU', 'University of Queensland', 'Monash University', 'University of Adelaide', 'University of Western Australia', '其他'], required: false },
      { type: 'single_choice', title: '你最大的申请痛点是什么？', options: ['不知道选什么方向', '不知道怎么找导师', '不知道怎么写Research Proposal', '不确定自己的背景够不够', '预算有限'], required: true },
      { type: 'text', title: '你有什么想问 Koala 的？', required: false },
    ],
  },
  {
    id: 'event_feedback',
    name: '活动反馈问卷',
    description: '收集线下/线上活动参与者反馈',
    icon: '📋',
    questions: [
      { type: 'rating', title: '你对本次活动的总体评分？', config: { max: 5 }, required: true },
      { type: 'single_choice', title: '活动内容是否对你有帮助？', options: ['非常有帮助', '比较有帮助', '一般', '没什么帮助'], required: true },
      { type: 'multiple_choice', title: '你最感兴趣的环节是？（可多选）', options: ['嘉宾分享', 'Q&A互动', '社交环节', '资料分享'], required: false },
      { type: 'single_choice', title: '你是否愿意推荐给朋友？', options: ['一定会', '可能会', '不太会'], required: true },
      { type: 'text', title: '你对未来活动有什么建议？', required: false },
    ],
  },
  {
    id: 'nps',
    name: 'NPS 满意度',
    description: '净推荐值调研',
    icon: '⭐',
    questions: [
      { type: 'scale', title: '你有多大可能向朋友推荐 Koala？', config: { min: 0, max: 10, minLabel: '完全不会', maxLabel: '一定会' }, required: true },
      { type: 'single_choice', title: '你使用过 Koala 的哪些服务？', options: ['AI 对话', '教授匹配', '套磁信', 'Research Proposal', '其他'], required: true },
      { type: 'text', title: '你最喜欢 Koala 的什么？', required: false },
      { type: 'text', title: '你觉得 Koala 最需要改进什么？', required: false },
    ],
  },
  {
    id: 'blank',
    name: '空白问卷',
    description: '从零开始创建自定义问卷',
    icon: '📝',
    questions: [],
  },
];
