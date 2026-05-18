'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Zap, Loader2 } from 'lucide-react';
import { CREDIT_PACKAGES, BRAND } from '../../lib/constants';

const FREE_TOOLS_GRID = [
  { icon: '📊', title: 'GPA 换算器',     desc: '中国GPA → 澳洲标准一键转换', href: '/koala/tools/niv' },
  { icon: '🛂', title: 'NIV 签证预评',   desc: '评估签证申请条件',          href: '/koala/tools/niv' },
  { icon: '🔬', title: 'ARC 项目浏览',   desc: '查看最新澳洲研究经费项目',   href: '/koala/chat?mode=research' },
  { icon: '🎯', title: 'PhD 路径自评',   desc: '评估申请竞争力与准备程度',   href: '/koala/chat?mode=path' },
  { icon: '👨‍🏫', title: '教授 Top 10 匹配', desc: '免费获取最匹配的 10 位学者', href: '/koala/chat?mode=research' },
  { icon: '✉️', title: '免费申请信',     desc: '免费生成第 1 封定制申请信',  href: '/koala/chat?mode=write' },
];

export default function ToolsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleCheckout(priceId: string, itemId: string) {
    if (!priceId) {
      setToast({ type: 'error', message: '支付尚未配置，请联系管理员' });
      return;
    }
    setLoadingId(itemId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = '/login?redirect=/koala/tools';
      } else {
        setToast({ type: 'error', message: data.error || '创建支付失败' });
      }
    } catch {
      setToast({ type: 'error', message: '网络错误，请重试' });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="pb-8 bg-gray-50 dark:bg-[#080c10]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#D4A843]/10">
        <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">工具 & 定价</h1>
        <p className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
          免费工具直接用 · 订阅解锁更多功能
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

      {/* ── Value separator ── */}
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

      {/* ── Credit packs ── */}
      <div className="px-4 mt-6">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">积分充值包</h2>
          <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
            与订阅独立 · 用完月度额度后按需购买 · 永不过期
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CREDIT_PACKAGES.map(pack => {
            const isPro = pack.id === 'credit_pro';
            return (
              <div
                key={pack.id}
                className={[
                  'rounded-xl p-3 flex flex-col gap-1',
                  isPro
                    ? 'bg-amber-50/50 dark:bg-[#D4A843]/12 border-[1.5px] border-[#D4A843]'
                    : 'bg-white dark:bg-white/5 border border-amber-200/50 dark:border-[#D4A843]/10',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">{pack.label}</div>
                  {isPro && (
                    <div className="flex items-center gap-1">
                      <Zap className="size-3 text-amber-700 dark:text-[#D4A843]" />
                      <span className="text-[10px] font-medium text-amber-700 dark:text-[#D4A843]">最划算</span>
                    </div>
                  )}
                  {'bonus' in pack && pack.bonus && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {pack.bonus}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">{pack.credits} 积分 · {pack.unit}</div>
                <div className="text-base font-bold mt-1 text-amber-600 dark:text-[#D4A843]">
                  AUD {pack.priceAUD}
                </div>
                <button
                  onClick={() => handleCheckout(pack.stripePriceId, pack.id)}
                  disabled={loadingId === pack.id}
                  className="mt-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-gray-100 dark:bg-[#D4A843]/6 text-gray-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20"
                >
                  {loadingId === pack.id ? <Loader2 className="size-3 animate-spin mx-auto" /> : '购买'}
                </button>
              </div>
            );
          })}
        </div>

        {/* How credits work */}
        <div className="mt-3 rounded-xl p-3.5 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">积分使用说明</div>
          <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
            <div>• 生成 1 封申请信消耗 1 积分，确认弹窗后扣除</div>
            <div>• 订阅月度额度优先使用，用完后从积分余额扣除</div>
            <div>• 月度额度当月有效，不累积到下月</div>
            <div>• 单独购买的积分永久有效，不过期</div>
            <div>• 新用户首月订阅享 5 折优惠</div>
          </div>
        </div>
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
    </div>
  );
}
