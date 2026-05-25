'use client';

import { useEffect, useState, useCallback } from 'react';

interface Agent {
  id: string;
  user_id: string;
  referral_code: string;
  status: 'active' | 'suspended' | 'terminated';
  tier: string;
  created_at: string;
  user_profiles: { display_name: string; email: string; avatar_url: string | null } | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: '活跃', color: '#166534', bg: '#DCFCE7' },
  suspended:  { label: '暂停', color: '#92400E', bg: '#FEF3C7' },
  terminated: { label: '终止', color: '#991B1B', bg: '#FEE2E2' },
};

const TIER_CFG: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: 'Standard', color: '#6B7280', bg: '#F3F4F6' },
  senior:   { label: 'Senior', color: '#1E40AF', bg: '#DBEAFE' },
  partner:  { label: 'Partner', color: '#92400E', bg: '#FEF3C7' },
};

const TIER_OPTIONS = ['standard', 'senior', 'partner'];

export default function SalesAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; email: string; display_name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [newTier, setNewTier] = useState('standard');
  const [creating, setCreating] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/sales-agents?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setAgents(data.data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  async function searchUsers(q: string) {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = (data.data || data.users || []).map((u: any) => ({
        id: u.id || u.user_id,
        email: u.email,
        display_name: u.display_name || u.email,
      }));
      setUserResults(users);
    }
  }

  async function createAgent() {
    if (!selectedUser) return;
    setCreating(true);
    const res = await fetch('/api/admin/sales-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, tier: newTier }),
    });
    if (res.ok) {
      setShowModal(false);
      setSelectedUser(null);
      setUserSearch('');
      setNewTier('standard');
      loadAgents();
    } else {
      const err = await res.json();
      alert(err.error || '创建失败');
    }
    setCreating(false);
  }

  async function updateAgent(id: string, updates: { status?: string; tier?: string }) {
    const desc = updates.tier ? `等级变更为 ${TIER_CFG[updates.tier]?.label || updates.tier}` : `状态变更为 ${STATUS_CFG[updates.status || '']?.label || updates.status}`;
    if (!confirm(`确定要执行此操作吗？（${desc}）此操作不可撤销。`)) {
      loadAgents();
      return;
    }
    try {
      const res = await fetch(`/api/admin/sales-agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        loadAgents();
      } else {
        const err = await res.json();
        alert(err.error || '操作失败');
      }
    } catch (err) {
      alert((err as Error).message || '操作失败');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">销售人员管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium hover:opacity-90 transition"
        >
          + 添加销售
        </button>
      </div>

      <input
        placeholder="搜索姓名、邮箱或推广码..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F59E0B]"
      />

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">加载中...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">暂无销售人员</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2.5 font-medium">销售人员</th>
                  <th className="text-left px-4 py-2.5 font-medium">推广码</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-center px-4 py-2.5 font-medium">等级</th>
                  <th className="text-left px-4 py-2.5 font-medium">创建时间</th>
                  <th className="text-center px-4 py-2.5 font-medium">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] dark:divide-gray-700">
                {agents.map(agent => {
                  const profile = agent.user_profiles;
                  const statusCfg = STATUS_CFG[agent.status] || STATUS_CFG.active;
                  const tierCfg = TIER_CFG[agent.tier] || TIER_CFG.standard;
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                            {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{profile?.display_name || '未设置'}</div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">{agent.referral_code}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={agent.status}
                          onChange={e => updateAgent(agent.id, { status: e.target.value })}
                          className="text-[10px] px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none font-medium"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          <option value="active">活跃</option>
                          <option value="suspended">暂停</option>
                          <option value="terminated">终止</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={agent.tier}
                          onChange={e => updateAgent(agent.id, { tier: e.target.value })}
                          className="text-[10px] px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none font-medium"
                          style={{ background: tierCfg.bg, color: tierCfg.color }}
                        >
                          {TIER_OPTIONS.map(t => (
                            <option key={t} value={t}>{TIER_CFG[t]?.label || t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(agent.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{agent.id.slice(0, 8)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">添加销售人员</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">搜索用户（邮箱）</label>
                <input
                  placeholder="输入邮箱搜索..."
                  value={userSearch}
                  onChange={e => searchUsers(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:border-[#F59E0B]"
                />
                {userResults.length > 0 && (
                  <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-gray-800">
                    {userResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser({ id: u.id, email: u.email }); setUserResults([]); setUserSearch(u.email); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${selectedUser?.id === u.id ? 'bg-[#FFFBEB] dark:bg-amber-900/20' : ''}`}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{u.display_name}</span>
                        <span className="text-gray-400 dark:text-gray-500 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 text-xs text-[#166534]">已选择: {selectedUser.email}</div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">等级</label>
                <select
                  value={newTier}
                  onChange={e => setNewTier(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
                >
                  {TIER_OPTIONS.map(t => (
                    <option key={t} value={t}>{TIER_CFG[t]?.label || t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#E5E7EB] transition"
              >
                取消
              </button>
              <button
                onClick={createAgent}
                disabled={!selectedUser || creating}
                className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium disabled:opacity-40 transition hover:opacity-90"
              >
                {creating ? '创建中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
