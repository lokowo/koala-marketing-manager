'use client';

import { useState, useEffect, useCallback } from 'react';

interface BrandSettings {
  brand_name: string;
  slogan: string;
  logo_url: string;
  contact_email: string;
  wechat_id: string;
  xiaohongshu: string;
  primary_color: string;
  secondary_color: string;
}

const EMPTY_BRAND: BrandSettings = {
  brand_name: '', slogan: '', logo_url: '', contact_email: '',
  wechat_id: '', xiaohongshu: '', primary_color: '#3b82f6', secondary_color: '#c9a96e',
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
        type === 'success'
          ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
          : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
      }`}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [brand, setBrand] = useState<BrandSettings>(EMPTY_BRAND);
  const [savedBrand, setSavedBrand] = useState<BrandSettings>(EMPTY_BRAND);
  const [brandLoading, setBrandLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const isDirty = JSON.stringify(brand) !== JSON.stringify(savedBrand);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(d.role === 'super_admin'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/brand-settings')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        const s: BrandSettings = {
          brand_name: d.brand_name ?? '',
          slogan: d.slogan ?? '',
          logo_url: d.logo_url ?? '',
          contact_email: d.contact_email ?? '',
          wechat_id: d.wechat_id ?? '',
          xiaohongshu: d.xiaohongshu ?? '',
          primary_color: d.primary_color ?? '#3b82f6',
          secondary_color: d.secondary_color ?? '#c9a96e',
        };
        setBrand(s);
        setSavedBrand(s);
        setBrandLoading(false);
      })
      .catch(() => setBrandLoading(false));
  }, []);

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

  async function saveBrand() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/brand-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setSavedBrand({ ...brand });
      showToast('品牌设置已保存', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    }
    setSaving(false);
  }

  function resetBrand() {
    setBrand({ ...savedBrand });
  }

  function updateField(key: keyof BrandSettings, value: string) {
    setBrand((prev) => ({ ...prev, [key]: value }));
  }

  const inputCls = isSuperAdmin
    ? 'w-full text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition'
    : 'w-full text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md px-3 py-2 cursor-not-allowed';

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">系统设置</h2>

      {/* API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">API Keys 管理</h3>
        <div className="space-y-2">
          {['Anthropic API Key', 'OpenAI API Key', 'Semantic Scholar API Key', 'Resend API Key'].map(
            (key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs text-gray-600 dark:text-gray-400">{key}</span>
                <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">已配置</span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Slack */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slack 通知集成</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">关键事件自动推送到 Slack 频道</p>
          </div>
          <div className="flex items-center gap-2">
            {testResult === 'success' && <span className="text-[10px] text-green-600">发送成功</span>}
            {testResult === 'error' && <span className="text-[10px] text-red-500">发送失败</span>}
            <button
              onClick={testSlack}
              disabled={testing}
              className="text-[10px] px-3 py-1.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition"
            >
              {testing ? '发送中…' : '测试 Webhook'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">环境变量配置</p>
            <code className="text-[10px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
              SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
            </code>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-2">通知事件</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { event: '新用户注册', emoji: '🆕' },
                { event: '客服工单', emoji: '🎫' },
                { event: '客户阶段变更', emoji: '📈' },
                { event: '角色申请', emoji: '👤' },
                { event: '周报汇总', emoji: '📊' },
                { event: '自定义告警', emoji: '🔔' },
              ].map(n => (
                <div key={n.event} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400 py-1">
                  <span>{n.emoji}</span>
                  <span>{n.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Brand Settings — editable for super_admin */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">品牌设置</h3>
          {!isSuperAdmin && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">仅 Super Admin 可编辑</span>
          )}
        </div>

        {brandLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">品牌名称</label>
                <input
                  type="text"
                  value={brand.brand_name}
                  onChange={(e) => updateField('brand_name', e.target.value)}
                  disabled={!isSuperAdmin}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">联系邮箱</label>
                <input
                  type="email"
                  value={brand.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  disabled={!isSuperAdmin}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Slogan</label>
              <textarea
                value={brand.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
                disabled={!isSuperAdmin}
                rows={2}
                className={inputCls + ' resize-none'}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Logo URL</label>
              <input
                type="url"
                value={brand.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                disabled={!isSuperAdmin}
                placeholder={isSuperAdmin ? 'https://example.com/logo.png' : ''}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">WeChat ID</label>
                <input
                  type="text"
                  value={brand.wechat_id}
                  onChange={(e) => updateField('wechat_id', e.target.value)}
                  disabled={!isSuperAdmin}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">小红书账号</label>
                <input
                  type="text"
                  value={brand.xiaohongshu}
                  onChange={(e) => updateField('xiaohongshu', e.target.value)}
                  disabled={!isSuperAdmin}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">主色调</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value)}
                    disabled={!isSuperAdmin}
                    className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={brand.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value)}
                    disabled={!isSuperAdmin}
                    className={inputCls + ' font-mono'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">辅助色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.secondary_color}
                    onChange={(e) => updateField('secondary_color', e.target.value)}
                    disabled={!isSuperAdmin}
                    className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={brand.secondary_color}
                    onChange={(e) => updateField('secondary_color', e.target.value)}
                    disabled={!isSuperAdmin}
                    className={inputCls + ' font-mono'}
                  />
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={saveBrand}
                  disabled={saving || !isDirty}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
                <button
                  onClick={resetBrand}
                  disabled={saving || !isDirty}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  重置
                </button>
                {isDirty && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">有未保存的更改</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
