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
  active: { label: '活跃', color: '#16a34a', bg: '#dcfce7' },
  suspended: { label: '暂停', color: '#ca8a04', bg: '#fef9c3' },
  terminated: { label: '终止', color: '#dc2626', bg: '#fee2e2' },
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
    const res = await fetch(`/api/admin/sales-agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) loadAgents();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">销售人员管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-4 py-2 rounded-lg bg-[#1A1A2E] text-white font-medium hover:opacity-90 transition"
        >
          + 添加销售
        </button>
      </div>

      <input
        placeholder="搜索姓名、邮箱或推广码..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
      />

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无销售人员</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-medium">销售人员</th>
                  <th className="text-left px-4 py-2.5 font-medium">推广码</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-center px-4 py-2.5 font-medium">等级</th>
                  <th className="text-left px-4 py-2.5 font-medium">创建时间</th>
                  <th className="text-center px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map(agent => {
                  const profile = agent.user_profiles;
                  const statusCfg = STATUS_CFG[agent.status] || STATUS_CFG.active;
                  return (
                    <tr key={agent.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {(profile?.display_name || profile?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{profile?.display_name || '未设置'}</div>
                            <div className="text-[10px] text-slate-400">{profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700">{agent.referral_code}</code>
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
                          className="text-[10px] px-2 py-1 rounded bg-slate-100 border-0 cursor-pointer focus:outline-none text-slate-700"
                        >
                          {TIER_OPTIONS.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(agent.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] text-slate-400">{agent.id.slice(0, 8)}</span>
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
          <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-bold text-slate-800 mb-4">添加销售人员</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">搜索用户（邮箱）</label>
                <input
                  placeholder="输入邮箱搜索..."
                  value={userSearch}
                  onChange={e => searchUsers(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {userResults.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {userResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser({ id: u.id, email: u.email }); setUserResults([]); setUserSearch(u.email); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition ${selectedUser?.id === u.id ? 'bg-amber-50' : ''}`}
                      >
                        <span className="font-medium text-slate-700">{u.display_name}</span>
                        <span className="text-slate-400 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 text-xs text-green-600">已选择: {selectedUser.email}</div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">等级</label>
                <select
                  value={newTier}
                  onChange={e => setNewTier(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                >
                  {TIER_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                取消
              </button>
              <button
                onClick={createAgent}
                disabled={!selectedUser || creating}
                className="text-xs px-4 py-2 rounded-lg bg-[#1A1A2E] text-white font-medium disabled:opacity-40 transition"
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
