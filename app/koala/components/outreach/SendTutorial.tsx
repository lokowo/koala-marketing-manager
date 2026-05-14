'use client';
import { useState } from 'react';

const TUTORIALS = [
  {
    client: 'Gmail 用户',
    icon: '📮',
    steps: [
      '1. 点击上方"打开邮箱发送"按钮',
      '2. 自动跳转到 Gmail 写信页面',
      '3. 检查收件人、主题、正文是否正确',
      '4. 如需修改，直接在 Gmail 里改',
      '5. 点击"发送"',
      '',
      '如果没有自动跳转：',
      '1. 点击"复制全部"按钮',
      '2. 打开 Gmail (mail.google.com)',
      '3. 点左上角"写信"',
      '4. 收件人/主题/正文处分别粘贴',
      '5. 点击"发送"',
    ],
  },
  {
    client: 'QQ邮箱 / 163邮箱',
    icon: '📧',
    steps: [
      '1. 点击"复制全部"按钮',
      '2. 打开你的邮箱 APP 或网页版',
      '3. 新建邮件',
      '4. 收件人：粘贴教授邮箱',
      '5. 主题：粘贴主题行',
      '6. 正文：粘贴邮件内容',
      '7. 检查无误后发送',
    ],
  },
  {
    client: '手机用户',
    icon: '📱',
    steps: [
      '1. 点击"复制全部"按钮',
      '2. 打开手机自带的邮箱 APP',
      '3. 新建邮件 → 逐项粘贴',
      '或者用"分步复制"，一个一个粘贴',
      '',
      '💡 建议：申请信最好在电脑上发。',
      '可以先点"稍后再发"，回到电脑操作。',
    ],
  },
];

const TIPS = [
  '📌 发送时间：澳洲时间周二至周四上午 9-11 点 (AEST)',
  '📌 发出后耐心等待 7-14 个工作日',
  '📌 14 天没回复，用预生成的 Follow-up 邮件跟进',
  '📌 不要同一天给同一位教授发多封邮件',
  '📌 使用学校邮箱（edu 结尾）发送效果更好',
];

export function SendTutorial() {
  const [activeClient, setActiveClient] = useState(0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TUTORIALS.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveClient(i)}
            className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-colors ${activeClient === i ? 'text-amber-700 dark:text-[#D4A843] bg-[#f5e8c4] border-amber-400 dark:border-[#D4A843]' : 'text-gray-500 dark:text-[#6a7a7e] bg-amber-50 dark:bg-[rgba(212,168,67,0.06)] border-amber-200/50 dark:border-[rgba(212,168,67,0.1)]'}`}
          >
            {t.icon} {t.client}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-3 bg-amber-50 dark:bg-[#D4A843]/10">
        {TUTORIALS[activeClient].steps.map((step, i) => (
          <div
            key={i}
            className={`text-[11px] leading-relaxed ${step === '' ? 'mt-2' : ''} ${step.startsWith('💡') ? 'text-amber-600 dark:text-[#D4A843]' : 'text-gray-700 dark:text-[#a8b8ac]'}`}
          >
            {step || ' '}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-amber-600 dark:text-[#D4A843]">发送小贴士</div>
        {TIPS.map((tip, i) => (
          <div key={i} className="text-[11px] leading-relaxed text-gray-700 dark:text-[#a8b8ac]">{tip}</div>
        ))}
      </div>
    </div>
  );
}
