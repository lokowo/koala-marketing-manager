interface QuestionInput {
  id: string;
  type: string;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  order_index: number;
  config?: Record<string, unknown>;
}

interface SurveyInput {
  title: string;
  description?: string;
  welcome_message?: string;
  brand_color?: string;
}

const TYPE_MAP: Record<string, string> = {
  single_choice: 'radiogroup',
  multiple_choice: 'checkbox',
  text: 'text',
  long_text: 'comment',
  rating: 'rating',
  nps: 'rating',
  scale: 'rating',
  dropdown: 'dropdown',
  phone: 'text',
  email: 'text',
  education: 'radiogroup',
  date: 'text',
  file_upload: 'file',
};

export function questionsToSurveyJson(
  survey: SurveyInput,
  questions: QuestionInput[]
): Record<string, unknown> {
  const questionCount = questions.length;
  const estimatedMinutes = Math.max(1, Math.ceil(questionCount * 0.5));

  // Build question elements
  const elements = questions
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => {
      const el: Record<string, unknown> = {
        type: TYPE_MAP[q.type] || 'text',
        name: q.id,
        title: q.title,
        isRequired: q.required,
      };

      if (q.description) {
        el.description = q.description;
      }

      if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && q.options) {
        el.choices = q.options;
      }

      if (q.type === 'education') {
        el.choices = ['高中', '大专', '本科在读', '本科毕业', '硕士在读', '硕士毕业', '博士在读', '博士毕业', '其他'];
      }

      if (q.type === 'rating') {
        el.rateMax = (q.config?.max as number) || 5;
      }

      if (q.type === 'nps' || q.type === 'scale') {
        el.rateMin = (q.config?.min as number) ?? 0;
        el.rateMax = (q.config?.max as number) ?? 10;
        if (q.config?.minLabel) el.minRateDescription = q.config.minLabel;
        if (q.config?.maxLabel) el.maxRateDescription = q.config.maxLabel;
        if (q.type === 'nps') {
          el.minRateDescription = el.minRateDescription || '完全不推荐';
          el.maxRateDescription = el.maxRateDescription || '强烈推荐';
        }
      }

      if (q.type === 'phone') el.inputType = 'tel';
      if (q.type === 'email') el.inputType = 'email';
      if (q.type === 'date') el.inputType = 'date';

      return el;
    });

  const pages: Record<string, unknown>[] = [];

  // Intro/cover page
  pages.push({
    name: 'intro',
    elements: [
      {
        type: 'html',
        name: 'intro_html',
        html: `<div style="text-align:center;padding:24px 0">
          <div style="font-size:36px;margin-bottom:16px">📋</div>
          <h2 style="font-size:22px;font-weight:700;margin-bottom:10px;color:#1e293b">${escapeHtml(survey.title)}</h2>
          ${survey.description ? `<p style="color:#64748b;margin-bottom:14px;font-size:14px;line-height:1.6">${escapeHtml(survey.description)}</p>` : ''}
          ${survey.welcome_message ? `<p style="color:#475569;font-size:14px">${escapeHtml(survey.welcome_message)}</p>` : ''}
          <p style="color:#D4A843;margin-top:16px;font-size:14px">📝 共 ${questionCount} 道题 · ⏱ 预计 ${estimatedMinutes} 分钟</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:10px">您的回答将被保密处理</p>
        </div>`,
      },
    ],
  });

  // Contact info page (auto-injected)
  pages.push({
    name: 'contact',
    title: '基本信息',
    description: '请填写您的联系方式，方便我们与您沟通',
    elements: [
      {
        type: 'text',
        name: '__contact_name',
        title: '您的姓名',
        isRequired: true,
        placeholder: '请输入您的姓名',
      },
      {
        type: 'text',
        name: '__contact_phone',
        title: '手机号',
        isRequired: true,
        inputType: 'tel',
        placeholder: '请输入手机号',
      },
      {
        type: 'text',
        name: '__contact_email',
        title: '邮箱',
        isRequired: true,
        inputType: 'email',
        placeholder: '请输入邮箱地址',
      },
      {
        type: 'text',
        name: '__contact_wechat',
        title: '微信号（选填）',
        isRequired: false,
        placeholder: '请输入微信号',
      },
      {
        type: 'html',
        name: '__registration_hint',
        html: '<div id="registration-panel-mount"></div>',
      },
    ],
  });

  // Questions page
  pages.push({
    name: 'questions',
    elements,
  });

  return {
    title: survey.title,
    description: survey.description || '',
    pages,
    showProgressBar: 'top',
    progressBarType: 'pages',
    firstPageIsStarted: true,
    startSurveyText: '开始填写',
    completeText: '提交问卷',
    pageNextText: '下一页',
    pagePrevText: '上一页',
    completedHtml: `<div style="text-align:center;padding:40px 0">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <h2 style="font-size:22px;font-weight:700;color:#1e293b">感谢您的参与！</h2>
      <p style="color:#64748b;margin-top:8px">您的回答对我们非常重要</p>
    </div>`,
    showQuestionNumbers: 'on',
    questionErrorLocation: 'bottom',
    locale: 'zh-cn',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
