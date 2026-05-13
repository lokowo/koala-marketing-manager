'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  async function testSlack() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/slack-test', { method: 'POST' });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setTesting(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">系统设置</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">API Keys 管理</h3>
        <div className="space-y-2">
          {['Anthropic API Key', 'OpenAI API Key', 'Semantic Scholar API Key', 'Resend API Key'].map(
            (key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-600">{key}</span>
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">已配置</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Slack 通知集成</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">关键事件自动推送到 Slack 频道</p>
          </div>
          <div className="flex items-center gap-2">
            {testResult === 'success' && <span className="text-[10px] text-green-600">发送成功</span>}
            {testResult === 'error' && <span className="text-[10px] text-red-500">发送失败</span>}
            <button
              onClick={testSlack}
              disabled={testing}
              className="text-[10px] px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition"
            >
              {testing ? '发送中…' : '测试 Webhook'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] text-slate-500 mb-2">环境变量配置</p>
            <code className="text-[10px] text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
              SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
            </code>
          </div>

          <div>
            <p className="text-[10px] font-medium text-slate-500 mb-2">通知事件</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { event: '新用户注册', emoji: '🆕' },
                { event: '客服工单', emoji: '🎫' },
                { event: '客户阶段变更', emoji: '📈' },
                { event: '角色申请', emoji: '👤' },
                { event: '周报汇总', emoji: '📊' },
                { event: '自定义告警', emoji: '🔔' },
              ].map(n => (
                <div key={n.event} className="flex items-center gap-2 text-[10px] text-slate-600 py-1">
                  <span>{n.emoji}</span>
                  <span>{n.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">品牌设置</h3>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-400">品牌名称</span><span>Koala PhD</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-400">AI 名称</span><span>考拉学长</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-400">域名</span><span>koalaphd.com</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-400">微信</span><span>MissKoalaAu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
