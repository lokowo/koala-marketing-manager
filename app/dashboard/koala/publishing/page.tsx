'use client';

import { useState, useEffect } from 'react';
import type { PublishingItem } from '../../../lib/types';
import type { PublishingStats } from '../../../lib/services/publishingService';
import { useLanguage } from '../../../components/LanguageContext';

const platforms = ['Xiaohongshu', 'WeChat', 'Website', 'LinkedIn', 'Douyin', 'Instagram'] as const;

const emptyForm: Omit<PublishingItem, 'id' | 'createdAt'> = {
  platform: 'Xiaohongshu', contentTitle: '', publishDate: '', publishUrl: '',
  views: 0, likes: 0, saves: 0, comments: 0, dms: 0, wechatAdds: 0,
  consultations: 0, conversionNotes: '',
};

export default function PublishingPage() {
  const { t } = useLanguage();
  const tp = t.publishing;
  const [records, setRecords] = useState<PublishingItem[]>([]);
  const [stats, setStats] = useState<PublishingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/publishing')
      .then(r => r.json())
      .then(({ data, stats }) => { setRecords(data); setStats(stats); setLoading(false); });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numFields = ['views', 'likes', 'saves', 'comments', 'dms', 'wechatAdds', 'consultations'];
    setFormData(prev => ({
      ...prev,
      [name]: numFields.includes(name) ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/publishing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const { data } = await res.json();
    setRecords(prev => [...prev, data]);
    // Refresh stats
    fetch('/api/publishing').then(r => r.json()).then(({ stats }) => setStats(stats));
    setShowForm(false);
    setFormData(emptyForm);
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-slate-500">Loading publishing records...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600 text-sm">{tp.totalViews}</p>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600 text-sm">{tp.totalDMs}</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.totalDMs}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600 text-sm">{tp.totalConsultations}</p>
          <p className="text-3xl font-bold text-green-600">{stats?.totalConsultations}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600 text-sm">{tp.bestPlatform}</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.bestPlatform}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{tp.pageTitle} ({records.length})</h3>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {tp.addButton}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">{tp.addHeading}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select name="platform" value={formData.platform} onChange={handleInputChange} className="p-2 border rounded">
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="text" name="contentTitle" placeholder={tp.fields.contentTitle} value={formData.contentTitle} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="date" name="publishDate" value={formData.publishDate} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="url" name="publishUrl" placeholder={tp.fields.publishUrl} value={formData.publishUrl} onChange={handleInputChange} className="p-2 border rounded" required />
              {(['views', 'likes', 'saves', 'comments', 'dms', 'wechatAdds', 'consultations'] as const).map(field => (
                <input key={field} type="number" name={field} placeholder={tp.fields[field]} value={formData[field]} onChange={handleInputChange} className="p-2 border rounded" min="0" />
              ))}
            </div>
            <textarea name="conversionNotes" placeholder={tp.fields.conversionNotes} value={formData.conversionNotes} onChange={handleInputChange} className="w-full p-2 border rounded" rows={2} />
            <div className="flex space-x-2">
              <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                {saving ? '…' : t.common.saveRecord}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700">
                {t.common.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                {Object.values(tp.tableHeaders).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{record.platform}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.contentTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{record.publishDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">{record.views.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{record.likes}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{record.saves}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{record.comments}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">{record.dms}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{record.wechatAdds}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">{record.consultations}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.conversionNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
