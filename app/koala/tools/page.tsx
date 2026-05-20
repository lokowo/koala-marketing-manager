'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { BRAND } from '../../lib/constants';

const FREE_TOOLS_GRID = [
  { icon: '📊', title: 'GPA 换算器',     desc: '中国GPA → 澳洲标准一键转换', href: '/koala/tools/niv' },
  { icon: '🛂', title: 'NIV 签证预评',   desc: '评估签证申请条件',          href: '/koala/tools/niv' },
  { icon: '🔬', title: 'ARC 项目浏览',   desc: '查看最新澳洲研究经费项目',   href: '/koala/chat?mode=research' },
  { icon: '🎯', title: 'PhD 路径自评',   desc: '评估申请竞争力与准备程度',   href: '/koala/chat?mode=path' },
  { icon: '👨‍🏫', title: '教授 Top 10 匹配', desc: '免费获取最匹配的 10 位学者', href: '/koala/chat?mode=research' },
  { icon: '✉️', title: '免费申请信',     desc: '免费生成第 1 封定制申请信',  href: '/koala/chat?mode=write' },
];

export default function ToolsPage() {
  return (
    <div className="pb-8 bg-gray-50 dark:bg-[#080c10]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#D4A843]/10">
        <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">免费工具箱</h1>
        <p className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
          无需注册，直接使用
        </p>
      </div>

      {/* ── Free Tools ── */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">免费工具箱</h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            无需注册
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {FREE_TOOLS_GRID.map(tool => (
            <Link
              key={tool.title}
              href={tool.href}
              className="rounded-2xl p-3.5 flex flex-col gap-1.5 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/6"
              style={{ boxShadow: '0 2px 8px rgba(196,160,80,0.08)' }}
            >
              <span className="text-2xl">{tool.icon}</span>
              <div className="text-xs font-bold text-gray-900 dark:text-[#e8e4dc]">{tool.title}</div>
              <div className="text-[11px] leading-snug text-gray-500 dark:text-[#6a7a7e]">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Upgrade CTA ── */}
      <div className="mx-4 mt-5 rounded-2xl p-4 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
        <div className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-[#e8e4dc]">想要更多？订阅解锁完整功能</div>
        <div className="space-y-1 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />无限 AI 对话轮次</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />上传简历 & 成绩单自动解析</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />查看完整教授联系方式 & 论文</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />每月申请信额度 & PDF 报告下载</div>
        </div>
        <Link href="/koala/pricing" className="inline-block mt-2.5 text-xs px-3 py-1.5 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] no-underline font-medium">
          查看订阅套餐 →
        </Link>
      </div>

      {/* Human consultation */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
          <div className="text-sm font-semibold mb-1">📞 预约人工深度咨询</div>
          <div className="text-xs opacity-90 mb-2">AUD 999+ · 人工审核 + 完整申请策略规划</div>
          <div className="text-xs opacity-80">
            WeChat: {BRAND.wechat} · {BRAND.email}
          </div>
          <div className="text-[10px] opacity-60 mt-1">{BRAND.positioning}</div>
        </div>
      </div>

      {/* Free tools reminder */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-3.5 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">免费工具（无需订阅）</div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
            {['GPA 换算', 'NIV 签证预评', 'ARC 项目浏览', '博客 & 指南', 'PhD 路径自评', '教授 Top 10 匹配'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />
                {t}
              </div>
            ))}
          </div>
          <Link
            href="/koala/chat"
            className="inline-block mt-3 text-xs px-3 py-1.5 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] no-underline"
          >
            免费开始 →
          </Link>
        </div>
      </div>

      {/* Pricing link */}
      <div className="px-4 mt-5 text-center">
        <Link
          href="/koala/pricing"
          className="inline-flex items-center gap-1 text-xs font-medium no-underline text-[#1A1A2E] dark:text-[#D4A843]"
        >
          需要更多积分？查看定价 →
        </Link>
      </div>
    </div>
  );
}
