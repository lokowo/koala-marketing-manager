'use client';
import { useEffect } from 'react';

export default function RevenuePage() {
  useEffect(() => {
    // Would fetch revenue data from API in production
  }, []);

  const metrics = [
    { label: '申请信销售额', value: 'AUD 0', change: '+0%', icon: '✉️', color: 'bg-green-50' },
    { label: '申请信购买数', value: '0', change: '', icon: '📧', color: 'bg-blue-50' },
    { label: '订阅用户数', value: '0', change: '', icon: '👥', color: 'bg-purple-50' },
    { label: '月经常性收入', value: 'AUD 0', change: '', icon: '💰', color: 'bg-yellow-50' },
  ];

  const tiers = [
    { name: 'Free', users: 0, revenue: 0 },
    { name: 'Starter ($19.9/mo)', users: 0, revenue: 0 },
    { name: 'Pro ($49/mo)', users: 0, revenue: 0 },
    { name: 'Elite ($99/mo)', users: 0, revenue: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">收入统计</h1>
        <p className="text-sm text-gray-500 mt-1">申请信销售、订阅收入与转化率分析</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className={`${m.color} rounded-lg p-4 border border-gray-200`}>
            <div className="text-2xl mb-1">{m.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            {m.change && <div className="text-sm text-green-600">{m.change}</div>}
            <div className="text-sm text-gray-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">订阅分布</h2>
          <div className="space-y-3">
            {tiers.map(tier => (
              <div key={tier.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{tier.name}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{tier.users} 用户</div>
                  <div className="text-xs text-gray-500">AUD {tier.revenue}/mo</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">转化率漏斗</h2>
          <div className="space-y-2">
            {[
              { stage: '访问首页', value: 100, pct: '100%' },
              { stage: '开始 AI 对话', value: 0, pct: '0%' },
              { stage: '完成路径评估', value: 0, pct: '0%' },
              { stage: '查看教授匹配', value: 0, pct: '0%' },
              { stage: '购买申请信', value: 0, pct: '0%' },
            ].map(stage => (
              <div key={stage.stage}>
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="text-gray-700">{stage.stage}</span>
                  <span className="text-gray-500">{stage.pct}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-700 rounded-full"
                    style={{ width: `${stage.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">转化数据将在有用户数据后显示</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">最近订单</h2>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p>暂无订单数据</p>
          <p className="text-sm mt-1">用户购买申请信或订阅后将显示在此</p>
        </div>
      </div>
    </div>
  );
}
