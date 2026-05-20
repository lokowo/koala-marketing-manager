'use client';

import { useEffect, useState } from 'react';

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

export default function ReferralUsersPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/my-referrals?search=${encodeURIComponent(search)}&sort=${sort}`)
      .then(r => r.json())
      .then(d => { setReferrals(d.data || []); setLoading(false); });
  }, [search, sort]);

  const totalRevenue = referrals.reduce((s, r) => s + r.total_revenue, 0);
  const totalCommission = referrals.reduce((s, r) => s + r.total_commission, 0);
  const paidCount = referrals.filter(r => r.has_paid).length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#111827]">推荐用户</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总推荐', value: referrals.length, icon: '👥' },
          { label: '已付费', value: paidCount, icon: '💳' },
          { label: '总消费', value: `$${totalRevenue.toFixed(2)}`, icon: '💰' },
          { label: '总佣金', value: `$${totalCommission.toFixed(2)}`, icon: '🏆' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 bg-white border border-[#E5E7EB]">
            <div className="text-[10px] text-[#6B7280] mb-1">{item.icon} {item.label}</div>
            <div className="text-xl font-bold text-[#111827]">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex gap-3">
        <input
          placeholder="搜索用户名或邮箱..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm bg-white border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
        />
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
      ) : referrals.length === 0 ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">暂无推荐用户</p>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280]">
                  <th className="text-left px-4 py-2.5 font-medium">用户</th>
                  <th className="text-left px-4 py-2.5 font-medium">渠道</th>
                  <th className="text-left px-4 py-2.5 font-medium">注册时间</th>
                  <th className="text-center px-4 py-2.5 font-medium">付费状态</th>
                  <th className="text-center px-4 py-2.5 font-medium">总消费</th>
                  <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                        {CH_LABELS[r.channel] || r.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(r.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_paid ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">已付费</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">未付费</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[#374151] font-medium">${r.total_revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-[#D4A843] font-medium">${r.total_commission.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
