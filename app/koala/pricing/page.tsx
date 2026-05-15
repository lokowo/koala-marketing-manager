'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { Check, X, Loader2, Crown, Zap, Star } from 'lucide-react';
import { CREDIT_PACKAGES, SUBSCRIPTION_TIERS } from '../../lib/constants';
import { useSearchParams } from 'next/navigation';

const FREE_FEATURES = [
  { text: '每天 10 轮 AI 对话', ok: true },
  { text: 'Top 10 教授匹配（免费查看）', ok: true },
  { text: '1 封免费申请信', ok: true },
  { text: '博客 / NIV签证评估 / GPA换算', ok: true },
  { text: '上传简历 & 成绩单分析', ok: false },
  { text: '教授完整数据（经费/论文/联系方式）', ok: false },
  { text: 'PDF 报告下载', ok: false },
];

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="size-4" />,
  pro: <Star className="size-4" />,
  elite: <Crown className="size-4" />,
};

const TIERS = Object.values(SUBSCRIPTION_TIERS);

interface PlanSwitchPreview {
  type: 'upgrade' | 'downgrade';
  currentTier: string;
  targetTier: string;
  currentTierLabel: string;
  targetTierLabel: string;
  currentPrice: number;
  proratedAmount?: number;
  newMonthlyPrice: number;
  creditsDiff?: number;
  newMonthlyCredits?: number;
  effectiveDate?: string;
  effectiveNow: boolean;
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#080c10]"><Loader2 className="size-5 animate-spin text-gray-400" /></div>}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<number | null>(null);
  const [planType, setPlanType] = useState<string>('free');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; amount: number; type: string; description: string; created_at: string; balance_after: number }>>([]);
  const [switchPreview, setSwitchPreview] = useState<PlanSwitchPreview | null>(null);
  const [confirmingSwitch, setConfirmingSwitch] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(data.recentTransactions || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/subscription');
      if (res.ok) {
        const data = await res.json();
        setPlanType(data.plan_type || 'free');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCredits();
    fetchSubscription();
  }, [fetchCredits, fetchSubscription]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setToast({ type: 'success', message: '支付成功！积分正在到账...' });
      const poll = setInterval(fetchCredits, 2000);
      const timeout = setTimeout(() => clearInterval(poll), 20000);
      return () => { clearInterval(poll); clearTimeout(timeout); };
    }
    if (searchParams.get('canceled') === 'true') {
      setToast({ type: 'error', message: '支付已取消' });
    }
  }, [searchParams, fetchCredits]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
        window.location.href = '/login?redirect=/koala/pricing';
      } else {
        setToast({ type: 'error', message: data.error || '创建支付失败' });
      }
    } catch {
      setToast({ type: 'error', message: '网络错误，请重试' });
    } finally {
      setLoadingId(null);
    }
  }

  async function handlePortal() {
    setLoadingId('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setToast({ type: 'error', message: data.error || '无法打开订阅管理' });
      }
    } catch {
      setToast({ type: 'error', message: '网络错误，请重试' });
    } finally {
      setLoadingId(null);
    }
  }

  async function handlePlanSwitch(targetTierId: string) {
    setLoadingId(targetTierId);
    try {
      const res = await fetch('/api/stripe/upgrade/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTierId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSwitchPreview(data);
      } else if (res.status === 401) {
        window.location.href = '/login?redirect=/koala/pricing';
      } else {
        setToast({ type: 'error', message: data.error || '获取预览失败' });
      }
    } catch {
      setToast({ type: 'error', message: '网络错误，请重试' });
    } finally {
      setLoadingId(null);
    }
  }

  async function confirmPlanSwitch() {
    if (!switchPreview) return;
    setConfirmingSwitch(true);
    try {
      const res = await fetch('/api/stripe/upgrade/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTierId: switchPreview.targetTier }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSwitchPreview(null);
        if (data.type === 'upgrade') {
          setToast({ type: 'success', message: `升级成功！已补发 ${data.creditsDiff} 积分` });
          setPlanType(data.targetTier);
        } else {
          const date = data.effectiveDate ? new Date(data.effectiveDate).toLocaleDateString('zh-CN') : '';
          setToast({ type: 'success', message: `已安排降级，将于 ${date} 生效` });
        }
        fetchCredits();
        fetchSubscription();
      } else {
        setToast({ type: 'error', message: data.error || '操作失败' });
      }
    } catch {
      setToast({ type: 'error', message: '网络错误，请重试' });
    } finally {
      setConfirmingSwitch(false);
    }
  }

  const paymentTransactions = transactions.filter(t => t.type === 'purchase' || t.type === 'subscription_credit');

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-[#080c10]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-10 bg-gray-50 dark:bg-[#080c10] border-b border-gray-200 dark:border-[#D4A843]/20">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/koala/tools" className="text-[13px] text-[#1A1A2E] dark:text-[#D4A843]">&larr; 工具</Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">定价与积分</h1>
            <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">免费开始，按需升级</p>
          </div>
          {balance !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-[#D4A843]/15 border border-amber-300 dark:border-[#D4A843]/30">
              <span className="text-xs text-amber-700 dark:text-[#D4A843]">余额</span>
              <span className="text-sm font-bold text-amber-800 dark:text-[#e8e4dc]">{balance}</span>
              <span className="text-xs text-amber-700 dark:text-[#D4A843]">积分</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Free tier */}
        <div className="rounded-2xl overflow-hidden border-2 border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm">
          <div className="p-4 bg-amber-50 dark:bg-[#D4A843]/6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">免费版</div>
                <div className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">永久免费，无需信用卡</div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-[#e8e4dc]">
                AUD 0<span className="text-xs font-normal">/月</span>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2 bg-white dark:bg-white/5">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                {f.ok
                  ? <Check className="size-4 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />
                  : <X className="size-4 flex-shrink-0 text-gray-400 dark:text-[#d0b898]" />}
                <span className={`text-xs ${f.ok ? 'text-gray-700 dark:text-[#e8e4dc]' : 'text-gray-400 dark:text-[#b09878]'}`}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit packages */}
        <div id="credit-packs">
          <h2 className="text-sm font-bold mb-1 text-gray-900 dark:text-[#e8e4dc]">积分充值包</h2>
          <p className="text-xs mb-3 text-gray-500 dark:text-[#6a7a7e]">一次性购买，积分永久有效（不过期）</p>
          <div className="grid grid-cols-2 gap-2.5">
            {CREDIT_PACKAGES.map((pack, idx) => {
              const isHighlight = idx === 2;
              return (
                <div
                  key={pack.id}
                  className={[
                    'rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                    isHighlight
                      ? 'bg-amber-50 dark:bg-[#D4A843]/15 border-2 border-[#D4A843] ring-2 ring-[#D4A843]/40 shadow-md'
                      : 'bg-white dark:bg-white/5 border border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm',
                  ].join(' ')}
                >
                  {'bonus' in pack && (pack as { bonus?: string }).bonus && (
                    <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 inline-block bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
                      多送 {(pack as { bonus?: string }).bonus}
                    </div>
                  )}
                  <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">{pack.label}</div>
                  <div className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{pack.credits} 积分</div>
                  <div className="text-lg font-bold mt-1 text-gray-900 dark:text-[#e8e4dc]">AUD {pack.priceAUD.toFixed(2)}</div>
                  <div className="text-[10px] mt-0.5 text-amber-600 dark:text-[#D4A843]">{pack.unit}</div>
                  <button
                    onClick={() => handleCheckout(pack.stripePriceId, pack.id)}
                    disabled={loadingId === pack.id}
                    className={[
                      'w-full mt-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-1',
                      isHighlight
                        ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
                        : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                    ].join(' ')}
                  >
                    {loadingId === pack.id ? <Loader2 className="size-3.5 animate-spin" /> : '购买'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription tiers */}
        <div id="subscriptions">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">订阅套餐</h2>
            {planType !== 'free' && (
              <button
                onClick={handlePortal}
                disabled={loadingId === 'portal'}
                className="text-[11px] text-amber-600 dark:text-[#D4A843] underline disabled:opacity-60"
              >
                {loadingId === 'portal' ? '加载中...' : '管理订阅'}
              </button>
            )}
          </div>
          <p className="text-xs mb-3 text-gray-500 dark:text-[#6a7a7e]">每月自动续订，随时取消</p>
          <div className="space-y-3">
            {TIERS.map(tier => {
              const isCurrentPlan = planType === tier.id;
              const currentTierPrice = planType !== 'free' ? SUBSCRIPTION_TIERS[planType as keyof typeof SUBSCRIPTION_TIERS]?.price ?? 0 : 0;
              const isUpgrade = planType !== 'free' && !isCurrentPlan && tier.price > currentTierPrice;
              const isDowngrade = planType !== 'free' && !isCurrentPlan && tier.price < currentTierPrice;

              return (
                <div
                  key={tier.id}
                  className={[
                    'rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group relative',
                    tier.popular
                      ? 'border-2 border-[#D4A843] shadow-md'
                      : isCurrentPlan
                        ? 'border-2 border-green-500 dark:border-green-400 shadow-md'
                        : 'border border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm',
                  ].join(' ')}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A843]/60 to-[#4ECDC4]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {tier.popular && !isCurrentPlan && (
                    <div className="py-1.5 text-center text-xs font-bold text-white dark:text-[#080c10] bg-[#1A1A2E] dark:bg-[#D4A843]">
                      {TIER_ICONS[tier.id]} 最受欢迎
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="py-1.5 text-center text-xs font-bold text-white bg-green-600 dark:bg-green-500">
                      当前方案
                    </div>
                  )}
                  <div className={`p-4 ${tier.popular && !isCurrentPlan ? 'bg-amber-50 dark:bg-[#D4A843]/8' : 'bg-white dark:bg-white/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-600 dark:text-[#D4A843]">{TIER_ICONS[tier.id]}</span>
                          <span className="text-sm font-bold text-amber-600 dark:text-[#D4A843]">{tier.label}</span>
                        </div>
                        <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">每月 {tier.monthlyCredits} 积分</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900 dark:text-[#e8e4dc]">AUD {tier.price}</div>
                        <div className="text-[10px] text-gray-500 dark:text-[#b09878]">/月</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {tier.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="size-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-[#D4A843]" />
                          <span className="text-xs text-gray-700 dark:text-[#e8e4dc]">{f}</span>
                        </div>
                      ))}
                    </div>
                    {isCurrentPlan ? (
                      <button
                        onClick={handlePortal}
                        disabled={loadingId === 'portal'}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-[#a8b8ac] disabled:opacity-60"
                      >
                        管理订阅
                      </button>
                    ) : (isUpgrade || isDowngrade) ? (
                      <button
                        onClick={() => handlePlanSwitch(tier.id)}
                        disabled={loadingId === tier.id}
                        className={[
                          'w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1',
                          isUpgrade
                            ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
                            : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                        ].join(' ')}
                      >
                        {loadingId === tier.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isUpgrade ? `升级到 ${tier.label}` : `降级到 ${tier.label}`}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(tier.stripePriceId, tier.id)}
                        disabled={loadingId === tier.id}
                        className={[
                          'w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1',
                          tier.popular
                            ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
                            : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                        ].join(' ')}
                      >
                        {loadingId === tier.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : `开始 ${tier.label} 订阅`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase history */}
        {paymentTransactions.length > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-2 text-gray-900 dark:text-[#e8e4dc]">购买记录</h2>
            <div className="rounded-2xl overflow-hidden border border-amber-200/50 dark:border-[#D4A843]/10 bg-white dark:bg-white/5">
              {paymentTransactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`px-4 py-3 flex items-center justify-between ${i > 0 ? 'border-t border-gray-100 dark:border-[#D4A843]/10' : ''}`}
                >
                  <div>
                    <div className="text-xs font-medium text-gray-900 dark:text-[#e8e4dc]">{tx.description}</div>
                    <div className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">
                      {new Date(tx.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-green-600 dark:text-[#5a8060]">+{tx.amount}</div>
                    <div className="text-[10px] text-gray-400 dark:text-[#6a7a7e]">余额 {tx.balance_after}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <h2 className="text-xs font-bold mb-3 text-gray-900 dark:text-[#e8e4dc]">常见问题</h2>
          {[
            { q: '积分会过期吗？', a: '单独购买的积分永久有效，不过期。订阅积分在订阅有效期内可用。' },
            { q: '如何取消订阅？', a: '点击"管理订阅"按钮，在 Stripe 页面中取消。取消后当前订阅期仍然有效。' },
            { q: '积分不够用了怎么办？', a: '随时可以单独购买积分包，无需升级订阅。' },
            { q: '支持哪些支付方式？', a: '支持 Visa、Mastercard、Apple Pay、Google Pay 等主流支付方式。' },
          ].map((item, i) => (
            <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-amber-200/50 dark:border-[#D4A843]/10' : ''}>
              <div className="text-xs font-semibold mb-1 text-gray-900 dark:text-[#e8e4dc]">{item.q}</div>
              <div className="text-[11px] leading-relaxed text-gray-500 dark:text-[#a8b8ac]">{item.a}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-gray-400 dark:text-[#b09878]">
          价格以澳元 (AUD) 计算 · 支持 Stripe 安全支付 · 如有问题联系 info@koalaphd.com
        </p>
      </div>

      {/* Plan switch confirmation modal */}
      {switchPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111c28] border border-gray-200 dark:border-[#D4A843]/20 shadow-2xl">
            <div className="p-5">
              <h3 className="text-base font-bold mb-4 text-gray-900 dark:text-[#e8e4dc]">
                {switchPreview.type === 'upgrade' ? `升级到 ${switchPreview.targetTierLabel}` : `降级到 ${switchPreview.targetTierLabel}`}
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-[#6a7a7e]">当前方案</span>
                  <span className="font-medium text-gray-900 dark:text-[#e8e4dc]">{switchPreview.currentTierLabel} · AUD {switchPreview.currentPrice}/月</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-[#6a7a7e]">新方案</span>
                  <span className="font-medium text-gray-900 dark:text-[#e8e4dc]">{switchPreview.targetTierLabel} · AUD {switchPreview.newMonthlyPrice}/月</span>
                </div>

                {switchPreview.type === 'upgrade' ? (
                  <>
                    <div className="border-t border-gray-100 dark:border-[#D4A843]/10 pt-2.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-[#6a7a7e]">本月补差价</span>
                        <span className="font-bold text-amber-600 dark:text-[#D4A843]">AUD {switchPreview.proratedAmount?.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-[#6a7a7e] mt-0.5">Stripe 自动计算，立即扣款</div>
                    </div>
                    {(switchPreview.creditsDiff ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-[#6a7a7e]">立即补发</span>
                        <span className="font-bold text-green-600 dark:text-[#5a8060]">+{switchPreview.creditsDiff} 积分</span>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 dark:text-[#6a7a7e]">
                      下月起：AUD {switchPreview.newMonthlyPrice}/月
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-100 dark:border-[#D4A843]/10 pt-2.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-[#6a7a7e]">生效时间</span>
                        <span className="font-medium text-gray-900 dark:text-[#e8e4dc]">
                          {switchPreview.effectiveDate ? new Date(switchPreview.effectiveDate).toLocaleDateString('zh-CN') : '当前周期结束后'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] leading-relaxed text-gray-400 dark:text-[#6a7a7e]">
                      本月不受影响，继续享有 {switchPreview.currentTierLabel} 全部功能。降级将在当前计费周期结束后自动生效。
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 p-4 pt-0">
              <button
                onClick={() => setSwitchPreview(null)}
                disabled={confirmingSwitch}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-[#a8b8ac] disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={confirmPlanSwitch}
                disabled={confirmingSwitch}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1',
                  switchPreview.type === 'upgrade'
                    ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]'
                    : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                ].join(' ')}
              >
                {confirmingSwitch ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : switchPreview.type === 'upgrade' ? '确认升级' : '确认降级'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
