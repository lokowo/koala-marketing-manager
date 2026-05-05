'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Professor } from '../../../lib/types';
import { useLanguage } from '../../../components/LanguageContext';

const emptyForm: Omit<Professor, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', university: '', faculty: '', title: '',
  researchAreas: [], email: '', profileUrl: '', googleScholarUrl: '',
  grantStatus: 'Pending', suitableStudentBackgrounds: [],
  potentialRpTopics: [], references: '', verificationStatus: 'Pending',
};

export default function ProfessorsPage() {
  const { t } = useLanguage();
  const tp = t.professors;
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/professors')
      .then(r => r.json())
      .then(({ data }) => { setProfessors(data); setLoading(false); });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const arrayFields = ['researchAreas', 'suitableStudentBackgrounds', 'potentialRpTopics'];
    setFormData(prev => ({
      ...prev,
      [name]: arrayFields.includes(name) ? value.split(',').map(s => s.trim()) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/professors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const { data } = await res.json();
    setProfessors(prev => [...prev, data]);
    setShowForm(false);
    setFormData(emptyForm);
    setSaving(false);
  };

  const generateContentUrl = (prof: Professor) => {
    const input = `${prof.name}, ${prof.title} at ${prof.university}. Research areas: ${prof.researchAreas.join(', ')}. Email: ${prof.email}.`;
    return `/dashboard/koala/content-generator?sourceType=Professor Profile&input=${encodeURIComponent(input)}`;
  };

  if (loading) return <div className="p-6 text-gray-500">Loading professors...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{tp.pageTitle} ({professors.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {tp.addButton}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">{tp.addHeading}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="name" placeholder={tp.placeholders.name} value={formData.name} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="university" placeholder={tp.placeholders.university} value={formData.university} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="faculty" placeholder={tp.placeholders.faculty} value={formData.faculty} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="title" placeholder={tp.placeholders.title} value={formData.title} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="researchAreas" placeholder={tp.placeholders.researchAreas} value={formData.researchAreas.join(', ')} onChange={handleInputChange} className="p-2 border rounded" />
              <input type="email" name="email" placeholder={tp.placeholders.email} value={formData.email} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="url" name="profileUrl" placeholder={tp.placeholders.profileUrl} value={formData.profileUrl} onChange={handleInputChange} className="p-2 border rounded" />
              <input type="url" name="googleScholarUrl" placeholder={tp.placeholders.googleScholarUrl} value={formData.googleScholarUrl} onChange={handleInputChange} className="p-2 border rounded" />
              <select name="grantStatus" value={formData.grantStatus} onChange={handleInputChange} className="p-2 border rounded">
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
              <input type="text" name="suitableStudentBackgrounds" placeholder={tp.placeholders.suitableStudentBackgrounds} value={formData.suitableStudentBackgrounds.join(', ')} onChange={handleInputChange} className="p-2 border rounded" />
              <input type="text" name="potentialRpTopics" placeholder={tp.placeholders.potentialRpTopics} value={formData.potentialRpTopics.join(', ')} onChange={handleInputChange} className="p-2 border rounded" />
              <select name="verificationStatus" value={formData.verificationStatus} onChange={handleInputChange} className="p-2 border rounded">
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <textarea name="references" placeholder={tp.placeholders.references} value={formData.references} onChange={handleInputChange} className="w-full p-2 border rounded" rows={3} />
            <div className="flex space-x-2">
              <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                {saving ? '…' : tp.saveButton}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                {tp.cancelButton}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.values(tp.tableHeaders).map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {professors.map((prof) => (
                <tr key={prof.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-blue-600 hover:text-blue-900 hover:underline">
                      {prof.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.university}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.researchAreas.join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.grantStatus}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prof.email || <span className="inline-flex items-center gap-1 text-orange-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 缺失</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      prof.verificationStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {prof.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={generateContentUrl(prof)} className="text-blue-600 hover:text-blue-900">
                      {t.grants.generateContent}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
