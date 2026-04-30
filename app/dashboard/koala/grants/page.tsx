'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Grant } from '../../../lib/types';
import { useLanguage } from '../../../components/LanguageContext';

const emptyForm: Omit<Grant, 'id' | 'createdAt' | 'updatedAt'> = {
  grantName: '', fundingBody: '', year: '', amount: '',
  leadProfessor: '', university: '', industryPartner: '',
  projectTitle: '', projectAbstract: '', keywords: [],
  phdRelevance: 'Medium', industryScholarshipPotential: 'Medium',
  referenceUrl: '', verificationStatus: 'Pending',
};

export default function GrantsPage() {
  const { t } = useLanguage();
  const tg = t.grants;
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/grants')
      .then(r => r.json())
      .then(({ data }) => { setGrants(data); setLoading(false); });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'keywords' ? value.split(',').map(s => s.trim()) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const { data } = await res.json();
    setGrants(prev => [...prev, data]);
    setShowForm(false);
    setFormData(emptyForm);
    setSaving(false);
  };

  const generateContentUrl = (grant: Grant) => {
    const input = `${grant.grantName} by ${grant.fundingBody}. Lead: ${grant.leadProfessor} at ${grant.university}. Amount: ${grant.amount}. Project: ${grant.projectTitle}.`;
    return `/dashboard/koala/content-generator?sourceType=Grant & Funding&input=${encodeURIComponent(input)}`;
  };

  if (loading) return <div className="p-6 text-gray-500">Loading grants...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{tg.pageTitle} ({grants.length})</h3>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {tg.addButton}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">{tg.addHeading}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="grantName" placeholder={tg.placeholders.grantName} value={formData.grantName} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="fundingBody" placeholder={tg.placeholders.fundingBody} value={formData.fundingBody} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="year" placeholder={tg.placeholders.year} value={formData.year} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="amount" placeholder={tg.placeholders.amount} value={formData.amount} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="leadProfessor" placeholder={tg.placeholders.leadProfessor} value={formData.leadProfessor} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="university" placeholder={tg.placeholders.university} value={formData.university} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="industryPartner" placeholder={tg.placeholders.industryPartner} value={formData.industryPartner} onChange={handleInputChange} className="p-2 border rounded" />
              <input type="text" name="projectTitle" placeholder={tg.placeholders.projectTitle} value={formData.projectTitle} onChange={handleInputChange} className="p-2 border rounded" required />
              <input type="text" name="keywords" placeholder={tg.placeholders.keywords} value={formData.keywords.join(', ')} onChange={handleInputChange} className="p-2 border rounded" />
              <select name="phdRelevance" value={formData.phdRelevance} onChange={handleInputChange} className="p-2 border rounded">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select name="industryScholarshipPotential" value={formData.industryScholarshipPotential} onChange={handleInputChange} className="p-2 border rounded">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input type="url" name="referenceUrl" placeholder={tg.placeholders.referenceUrl} value={formData.referenceUrl} onChange={handleInputChange} className="p-2 border rounded" />
              <select name="verificationStatus" value={formData.verificationStatus} onChange={handleInputChange} className="p-2 border rounded">
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <textarea name="projectAbstract" placeholder={tg.placeholders.projectAbstract} value={formData.projectAbstract} onChange={handleInputChange} className="w-full p-2 border rounded" rows={3} required />
            <div className="flex space-x-2">
              <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                {saving ? '…' : tg.saveButton}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                {tg.cancelButton}
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
                {Object.values(tg.tableHeaders).map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grants.map((grant) => (
                <tr key={grant.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grant.grantName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.fundingBody}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.leadProfessor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.university}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.phdRelevance}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      grant.verificationStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {grant.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={generateContentUrl(grant)} className="text-blue-600 hover:text-blue-900">
                      {tg.generateContent}
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
