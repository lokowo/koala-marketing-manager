'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageContext';
import type { Professor, Grant } from '../../lib/types';

export default function KoalaDashboard() {
  const { t } = useLanguage();
  const td = t.dashboard;

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);

  useEffect(() => {
    fetch('/api/professors').then(r => r.json()).then(({ data }) => setProfessors(data.slice(0, 3)));
    fetch('/api/grants').then(r => r.json()).then(({ data }) => setGrants(data.slice(0, 3)));
  }, []);

  return (
    <div className="space-y-6">
      {/* Latest Professors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{td.latestProfessorCards}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {professors.map((prof) => (
            <div key={prof.id} className="p-4 border rounded-lg">
              <h4 className="font-semibold">{prof.name}</h4>
              <p className="text-sm text-gray-600">{prof.university}</p>
              <p className="text-sm">{prof.title}</p>
              <p className="text-xs text-gray-500">Status: {prof.verificationStatus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Grants */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{td.latestGrantCards}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {grants.map((grant) => (
            <div key={grant.id} className="p-4 border rounded-lg">
              <h4 className="font-semibold">{grant.grantName}</h4>
              <p className="text-sm text-gray-600">{grant.fundingBody}</p>
              <p className="text-sm">Year: {grant.year}</p>
              <p className="text-xs text-gray-500">Status: {grant.verificationStatus}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
