'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Trash2, Pencil, X, Loader2 } from 'lucide-react';

interface ContributedProfessor {
  id: string;
  name: string;
  university: string;
  faculty: string;
  positionTitle: string | null;
  researchAreas: string[];
  email: string;
  hIndex: number | null;
  contributedBy: string | null;
  contributedAt: string | null;
  contributorEmail?: string;
}

export default function ContributedProfessorsPage() {
  const [professors, setProfessors] = useState<ContributedProfessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', university: '', positionTitle: '', researchAreas: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProfessors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/professors?verificationStatus=user_contributed&showAll=true&sortBy=created_at&limit=100');
      if (res.ok) {
        const data = await res.json();
        setProfessors(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfessors(); }, [fetchProfessors]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/professors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'Verified' }),
      });
      if (res.ok) {
        setProfessors(prev => prev.filter(p => p.id !== id));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/professors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProfessors(prev => prev.filter(p => p.id !== id));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
    setDeleteConfirm(null);
  };

  const startEdit = (p: ContributedProfessor) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      university: p.university,
      positionTitle: p.positionTitle || '',
      researchAreas: p.researchAreas.join(', '),
    });
  };

  const handleSaveAndApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/professors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          university: editForm.university,
          positionTitle: editForm.positionTitle || null,
          researchAreas: editForm.researchAreas.split(',').map(s => s.trim()).filter(Boolean),
          verificationStatus: 'Verified',
        }),
      });
      if (res.ok) {
        setProfessors(prev => prev.filter(p => p.id !== id));
        setEditingId(null);
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleSave = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/professors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          university: editForm.university,
          positionTitle: editForm.positionTitle || null,
          researchAreas: editForm.researchAreas.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setProfessors(prev => prev.map(p => p.id === id ? {
          ...p,
          name: editForm.name,
          university: editForm.university,
          positionTitle: editForm.positionTitle || null,
          researchAreas: editForm.researchAreas.split(',').map(s => s.trim()).filter(Boolean),
        } : p));
        setEditingId(null);
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">用户贡献数据审核</h1>
        <p className="text-sm text-gray-500 mt-1">
          审核用户通过 AI 搜索录入的教授数据。通过后将出现在公开教授列表中。
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : professors.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">暂无待审核的用户贡献数据</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">
              共 {professors.length} 条待审核
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {professors.map(p => (
              <div key={p.id} className="px-4 py-4">
                {editingId === p.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">姓名</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">大学</label>
                        <input
                          type="text"
                          value={editForm.university}
                          onChange={e => setEditForm(f => ({ ...f, university: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">职位</label>
                        <input
                          type="text"
                          value={editForm.positionTitle}
                          onChange={e => setEditForm(f => ({ ...f, positionTitle: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">研究方向（逗号分隔）</label>
                        <input
                          type="text"
                          value={editForm.researchAreas}
                          onChange={e => setEditForm(f => ({ ...f, researchAreas: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveAndApprove(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === p.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        保存并通过
                      </button>
                      <button
                        onClick={() => handleSave(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        仅保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        <X className="size-3" /> 取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        {p.positionTitle && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {p.positionTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.university}
                        {p.faculty && <span> · {p.faculty}</span>}
                      </p>
                      {p.researchAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.researchAreas.slice(0, 5).map(area => (
                            <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700">
                              {area}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        {p.hIndex != null && <span>H-index: {p.hIndex}</span>}
                        {p.email && <span>{p.email}</span>}
                        {p.contributedAt && (
                          <span>
                            贡献于 {new Date(p.contributedAt).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {deleteConfirm === p.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-500 mr-1">确认删除？</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={actionLoading === p.id}
                            className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === p.id ? <Loader2 className="size-3 animate-spin" /> : '确认'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={actionLoading === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {actionLoading === p.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                            通过
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil className="size-3" /> 编辑
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="size-3" /> 删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
