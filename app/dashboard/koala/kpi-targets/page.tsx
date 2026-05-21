'use client';

import { useEffect, useState } from 'react';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { NumberInput } from '../../../../components/ui/number-input';
import { METRICS } from '../../../../lib/metrics-glossary';

interface Agent {
  id: string;
  user_id: string;
  referral_code: string;
  status: string;
  user_profiles: { display_name: string; email: string } | null;
}

interface KpiTarget {
  id: string;
  agent_id: string;
  effective_from: string;
  effective_until: string;
  period_type: string;
  kpi_1_visits: number;
  kpi_2_registrations: number;
  kpi_3_payments: number;
  kpi_3_revenue: number;
  kpi_4_offline: number;
  sales_agents?: { user_id: string; referral_code: string; user_profiles: { display_name: string; email: string } | null };
}

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end, label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
}

const KPI_FIELDS: { key: 'kpi_1_visits' | 'kpi_2_registrations' | 'kpi_3_payments' | 'kpi_3_revenue' | 'kpi_4_offline'; metricKey: keyof typeof METRICS; color: string; unit?: string }[] = [
  { key: 'kpi_1_visits', metricKey: 'kpiVisits', color: '#3B82F6' },
  { key: 'kpi_2_registrations', metricKey: 'kpiRegistrations', color: '#22C55E' },
  { key: 'kpi_3_payments', metricKey: 'kpiPayments', color: '#F59E0B' },
  { key: 'kpi_3_revenue', metricKey: 'kpiRevenue', color: '#D4A843', unit: '$' },
  { key: 'kpi_4_offline', metricKey: 'kpiOffline', color: '#8B5CF6' },
];

export default function KpiTargetsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthRange().label);
  const [showBatch, setShowBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({ kpi_1_visits: 50, kpi_2_registrations: 20, kpi_3_payments: 10, kpi_3_revenue: 500, kpi_4_offline: 5 });
  const [saving, setSaving] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, number>>({});
  const [savingAgent, setSavingAgent] = useState(false);

  const months = [-2, -1, 0, 1].map(o => getMonthRange(o));

  function refreshTargets() {
    fetch('/api/admin/kpi-targets').then(r => r.json()).then(res => {
      setTargets(res.data || []);
    });
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/sales-agents').then(r => r.json()),
      fetch('/api/admin/kpi-targets').then(r => r.json()),
    ]).then(([agentsRes, targetsRes]) => {
      setAgents((agentsRes.data || []).filter((a: Agent) => a.status === 'active'));
      setTargets(targetsRes.data || []);
      setLoading(false);
    });
  }, []);

  const currentMonth = months.find(m => m.label === selectedMonth) || months[2];
  const monthTargets = targets.filter(t => t.effective_from === currentMonth.start);

  function getTargetForAgent(agentId: string) {
    return monthTargets.find(t => t.agent_id === agentId);
  }

  async function saveBatchTargets() {
    setSaving(true);
    const activeAgentIds = agents.map(a => a.id);
    const res = await fetch('/api/admin/kpi-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_ids: activeAgentIds,
        effective_from: currentMonth.start,
        effective_until: currentMonth.end,
        ...batchForm,
      }),
    });
    if (res.ok) {
      refreshTargets();
      setShowBatch(false);
    } else {
      alert('保存失败');
    }
    setSaving(false);
  }

  function startEditAgent(agentId: string) {
    const t = getTargetForAgent(agentId);
    setEditForm({
      kpi_1_visits: t?.kpi_1_visits || 0,
      kpi_2_registrations: t?.kpi_2_registrations || 0,
      kpi_3_payments: t?.kpi_3_payments || 0,
      kpi_3_revenue: t?.kpi_3_revenue || 0,
      kpi_4_offline: t?.kpi_4_offline || 0,
    });
    setEditingAgent(agentId);
  }

  async function saveAgentTarget(agentId: string) {
    setSavingAgent(true);
    const existing = getTargetForAgent(agentId);
    if (existing) {
      await fetch('/api/admin/kpi-targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, ...editForm }),
      });
    } else {
      await fetch('/api/admin/kpi-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_ids: [agentId],
          effective_from: currentMonth.start,
          effective_until: currentMonth.end,
          ...editForm,
        }),
      });
    }
    refreshTargets();
    setEditingAgent(null);
    setSavingAgent(false);
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">分销 KPI 目标</h1>
        <button
          onClick={() => setShowBatch(!showBatch)}
          className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium hover:opacity-90 transition"
        >
          批量设置
        </button>
      </div>

      {/* Month selector */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0 -mb-px">
          {months.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMonth(m.label)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                selectedMonth === m.label
                  ? 'border-[#F59E0B] text-gray-900 dark:text-gray-100'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch form */}
      {showBatch && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            为所有活跃销售设置 {currentMonth.label} 目标
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
            {KPI_FIELDS.map(item => {
              const metric = METRICS[item.metricKey];
              return (
                <div key={item.key}>
                  <div className="mb-1">
                    <MetricLabel label={metric.label} tooltip={metric.tooltip} />
                  </div>
                  <NumberInput
                    value={batchForm[item.key]}
                    onChange={v => setBatchForm(prev => ({ ...prev, [item.key]: v }))}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBatch(false)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              取消
            </button>
            <button
              onClick={saveBatchTargets}
              disabled={saving}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#111827] text-white font-medium disabled:opacity-50 hover:opacity-90 transition"
            >
              {saving ? '保存中...' : `应用给 ${agents.length} 人`}
            </button>
          </div>
        </div>
      )}

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => {
          const profile = agent.user_profiles;
          const target = getTargetForAgent(agent.id);
          const isEditing = editingAgent === agent.id;
          return (
            <div key={agent.id} className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                  {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile?.display_name || '未知'}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{agent.referral_code}</div>
                </div>
                {target ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] dark:bg-emerald-900/30 dark:text-emerald-400">已设置</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">未设置</span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {KPI_FIELDS.map(field => {
                    const metric = METRICS[field.metricKey];
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 w-20 shrink-0 truncate">{metric.label}</span>
                        <NumberInput
                          value={editForm[field.key] ?? 0}
                          onChange={v => setEditForm(prev => ({ ...prev, [field.key]: v }))}
                          className="flex-1 rounded-md px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    );
                  })}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingAgent(null)}
                      className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => saveAgentTarget(agent.id)}
                      disabled={savingAgent}
                      className="text-[10px] px-3 py-1 rounded-md bg-[#111827] text-white font-medium disabled:opacity-50"
                    >
                      {savingAgent ? '...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : target ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {KPI_FIELDS.map(field => {
                      const metric = METRICS[field.metricKey];
                      return (
                        <div key={field.key} className="rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">{metric.label}</div>
                          <div className="text-sm font-bold" style={{ color: field.color }}>
                            {field.unit === '$' ? `$${target[field.key]}` : target[field.key]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => startEditAgent(agent.id)}
                    className="mt-2 w-full text-[10px] py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    编辑目标
                  </button>
                </>
              ) : (
                <div className="text-center py-3">
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    未设置目标
                  </div>
                  <button
                    onClick={() => startEditAgent(agent.id)}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    单独设置
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {agents.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">暂无活跃销售人员</p>
      )}
    </div>
  );
}
