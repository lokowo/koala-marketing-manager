'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Referral {
  id: string;
  referred_user_id: string;
  channel: string;
  landing_page: string;
  total_revenue: number;
  total_commission: number;
  created_at: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  has_paid: boolean;
}

const CH_LABELS: Record<string, string> = {
  wechat: '微信', xiaohongshu: '小红书', douyin: '抖音', weibo: '微博',
  zhihu: '知乎', bilibili: 'Bilibili', email: '邮件', whatsapp: 'WhatsApp',
  offline: '线下', survey: '调研', other: '其他', unknown: '未知',
};

const CH_COLORS: Record<string, string> = {
  wechat: '#22C55E', xiaohongshu: '#EF4444', douyin: '#1E293B',
  zhihu: '#0066FF', bilibili: '#00A1D6', email: '#3B82F6',
  weibo: '#FF6900', whatsapp: '#25D366', offline: '#8B5CF6',
  survey: '#F59E0B', other: '#9CA3AF', unknown: '#D1D5DB',
};

const PAGE_SIZE = 20;

export default function ReferralUsersPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [channelFilter, setChannelFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort', sort);
    fetch(`/api/sales/my-referrals?${params}`).then(r => {
      if (!r.ok) throw new Error(r.status === 403 ? '你还不是活跃的销售人员' : '加载失败');
      return r.json();
    }).then(d => {
      setReferrals(d.data || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [search, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = referrals.filter(r => {
    if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
    if (paidFilter === 'paid' && !r.has_paid) return false;
    if (paidFilter === 'unpaid' && r.has_paid) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRevenue = referrals.reduce((s, r) => s + r.total_revenue, 0);
  const totalCommission = referrals.reduce((s, r) => s + r.total_commission, 0);
  const paidCount = referrals.filter(r => r.has_paid).length;

  const channelOptions = ['all', ...new Set(referrals.map(r => r.channel))];

  function navigateToCustomer(referral: Referral) {
    router.push(`/dashboard/sales/customer/${referral.id}`);
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[#991B1B]">{error}</p>
      <button onClick={fetchData} className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition">重试</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111827]">我的客户</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总客户', value: String(referrals.length), color: '#3B82F6', bg: '#EFF6FF' },
          { label: '已付费', value: String(paidCount), color: '#10B981', bg: '#F0FDF4' },
          { label: '总消费', value: `$${totalRevenue.toFixed(2)}`, color: '#F59E0B', bg: '#FFFBEB' },
          { label: '总佣金', value: `$${totalCommission.toFixed(2)}`, color: '#D4A843', bg: '#FEF3C7' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 bg-white border border-[#E5E7EB]" style={{ background: item.bg }}>
            <div className="text-[10px] font-medium mb-0.5" style={{ color: item.color }}>{item.label}</div>
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="搜索用户名或邮箱..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] rounded-lg px-4 py-2.5 text-sm bg-white border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#F59E0B]"
        />
        <select
          value={channelFilter}
          onChange={e => { setChannelFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2.5 text-xs bg-white border border-[#E5E7EB] text-[#374151] focus:outline-none"
        >
          {channelOptions.map(ch => (
            <option key={ch} value={ch}>{ch === 'all' ? '全部渠道' : CH_LABELS[ch] || ch}</option>
          ))}
        </select>
        <select
          value={paidFilter}
          onChange={e => { setPaidFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2.5 text-xs bg-white border border-[#E5E7EB] text-[#374151] focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="paid">已付费</option>
          <option value="unpaid">未付费</option>
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-xs bg-white border border-[#E5E7EB] text-[#374151] focus:outline-none"
        >
          <option value="created_at">按时间</option>
          <option value="revenue">按消费</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="size-12 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] text-xl">👥</div>
          <p className="text-sm text-[#6B7280]">暂无推荐用户</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#6B7280]">
                    <th className="text-left px-4 py-2.5 font-medium">用户</th>
                    <th className="text-left px-4 py-2.5 font-medium">渠道</th>
                    <th className="text-left px-4 py-2.5 font-medium">注册时间</th>
                    <th className="text-center px-4 py-2.5 font-medium">状态</th>
                    <th className="text-center px-4 py-2.5 font-medium">消费</th>
                    <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {paged.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => navigateToCustomer(r)}
                      className="hover:bg-[#FFFBEB] cursor-pointer group"
                    >
                      <td className="px-4 py-3 border-l-2 border-transparent group-hover:border-[#F59E0B]">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#6B7280]">
                            {(r.display_name || r.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-[#111827]">{r.display_name || '未设置'}</div>
                            <div className="text-[10px] text-[#9CA3AF]">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: (CH_COLORS[r.channel] || '#9CA3AF') + '15', color: CH_COLORS[r.channel] || '#9CA3AF' }}
                        >
                          {CH_LABELS[r.channel] || r.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(r.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.has_paid ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-medium">已付费</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">未付费</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[#374151] font-medium">${r.total_revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-[#D4A843] font-bold">${r.total_commission.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>共 {filtered.length} 位用户，第 {page}/{totalPages} 页</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg transition ${
                        page === p ? 'bg-[#111827] text-white font-medium' : 'bg-[#F3F4F6] hover:bg-[#E5E7EB]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
