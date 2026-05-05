'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Professor } from '../../../../lib/types';

type RepairableField = 'email' | 'profileUrl' | 'googleScholarUrl' | 'positionTitle' | 'faculty';

const POSITION_TITLES = [
  'Professor', 'Associate Professor', 'Senior Lecturer', 'Lecturer',
  'Research Fellow', 'Senior Research Fellow', 'Postdoctoral Fellow',
] as const;

function MissingBadge() {
  return <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700">缺失</span>;
}

export default function ProfessorEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{ updated: Record<string, string>; confidence: Record<string, string>; notes: string } | null>(null);
  const [form, setForm] = useState<Partial<Professor>>({});

  useEffect(() => {
    fetch(`/api/professors/${id}`)
      .then(r => r.json())
      .then(({ data }) => {
        setProfessor(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const missingFields: RepairableField[] = professor ? (['email', 'profileUrl', 'googleScholarUrl', 'positionTitle', 'faculty'] as RepairableField[]).filter(f => !professor[f]) : [];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/professors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    router.push('/dashboard/koala/professors');
  }

  async function handleAiRepair() {
    setRepairing(true);
    setRepairResult(null);
    try {
      const res = await fetch(`/api/professors/${id}/ai-repair`, { method: 'POST' });
      const data = await res.json();
      setRepairResult(data);
      if (data.updated && Object.keys(data.updated).length > 0) {
        const refreshed = await fetch(`/api/professors/${id}`).then(r => r.json());
        setProfessor(refreshed.data);
        setForm(refreshed.data);
      }
    } catch {
      setRepairResult({ updated: {}, confidence: {}, notes: 'AI 修复请求失败' });
    }
    setRepairing(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const arrayFields = ['researchAreas', 'suitableStudentBackgrounds', 'potentialRpTopics'];
    setForm(prev => ({
      ...prev,
      [name]: arrayFields.includes(name) ? value.split(',').map(s => s.trim()) : value,
    }));
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!professor) return <div className="p-6 text-red-500">Professor not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/dashboard/koala/professors" className="text-sm text-blue-600 hover:underline">&larr; 返回列表</Link>
          <h3 className="text-lg font-semibold mt-1">{professor.name}</h3>
          <p className="text-sm text-gray-500">{professor.university}</p>
        </div>
        <button
          onClick={handleAiRepair}
          disabled={repairing || missingFields.length === 0}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {repairing ? (
            <><span className="animate-spin">⚙️</span> AI 修复中...</>
          ) : (
            <>🤖 AI 一键修复 {missingFields.length > 0 && `(${missingFields.length} 字段)`}</>
          )}
        </button>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ 缺失字段：{missingFields.join(', ')}
        </div>
      )}

      {repairResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <div className="font-semibold text-green-800 mb-2">AI 修复结果</div>
          {Object.keys(repairResult.updated).length > 0 ? (
            <ul className="space-y-1">
              {Object.entries(repairResult.updated).map(([field, value]) => (
                <li key={field} className="text-green-700">
                  ✅ {field}: <span className="font-mono">{value}</span>
                  {repairResult.confidence[field] && (
                    <span className="ml-2 text-xs text-gray-500">(置信度: {repairResult.confidence[field]})</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">未找到可修复的字段</p>
          )}
          {repairResult.notes && <p className="mt-2 text-xs text-gray-500">{repairResult.notes}</p>}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" name="name" value={form.name ?? ''} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">University</label>
            <input type="text" name="university" value={form.university ?? ''} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Faculty{!professor.faculty && <MissingBadge />}
            </label>
            <input type="text" name="faculty" value={form.faculty ?? ''} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input type="text" name="title" value={form.title ?? ''} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Position Title{!professor.positionTitle && <MissingBadge />}
            </label>
            <select name="positionTitle" value={form.positionTitle ?? ''} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="">-- Select --</option>
              {POSITION_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email{!professor.email && <MissingBadge />}
            </label>
            <input type="email" name="email" value={form.email ?? ''} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Profile URL{!professor.profileUrl && <MissingBadge />}
            </label>
            <input type="url" name="profileUrl" value={form.profileUrl ?? ''} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Google Scholar{!professor.googleScholarUrl && <MissingBadge />}
            </label>
            <input type="url" name="googleScholarUrl" value={form.googleScholarUrl ?? ''} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Research Areas</label>
            <input type="text" name="researchAreas" value={(form.researchAreas ?? []).join(', ')} onChange={handleChange} className="w-full p-2 border rounded" placeholder="comma-separated" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grant Status</label>
            <select name="grantStatus" value={form.grantStatus ?? 'Pending'} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Verification Status</label>
            <select name="verificationStatus" value={form.verificationStatus ?? 'Pending'} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Accepting Students</label>
            <select name="acceptingStudents" value={form.acceptingStudents ?? 'unknown'} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="likely">Likely</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Suitable Student Backgrounds</label>
          <input type="text" name="suitableStudentBackgrounds" value={(form.suitableStudentBackgrounds ?? []).join(', ')} onChange={handleChange} className="w-full p-2 border rounded" placeholder="comma-separated" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Potential RP Topics</label>
          <input type="text" name="potentialRpTopics" value={(form.potentialRpTopics ?? []).join(', ')} onChange={handleChange} className="w-full p-2 border rounded" placeholder="comma-separated" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">References / Notes</label>
          <textarea name="references" value={form.references ?? ''} onChange={handleChange} className="w-full p-2 border rounded" rows={3} />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
          <Link href="/dashboard/koala/professors" className="px-6 py-2 rounded border text-gray-600 hover:bg-gray-50">
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
