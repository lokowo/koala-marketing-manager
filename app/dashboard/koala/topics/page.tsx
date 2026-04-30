'use client';

import { useState, useEffect } from 'react';
import type { Topic } from '../../../lib/types';
import { useLanguage } from '../../../components/LanguageContext';

export default function TopicsPage() {
  const { t } = useLanguage();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/topics')
      .then(r => r.json())
      .then(({ data }) => { setTopics(data); setLoading(false); });
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.topics.pageTitle}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topics.map((topic) => (
          <div key={topic.id} className="bg-white rounded-lg shadow p-6">
            <h4 className="text-xl font-semibold mb-2">{topic.name}</h4>
            <p className="text-gray-600">{topic.description}</p>
            {topic.researchField && (
              <span className="mt-3 inline-block text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {topic.researchField}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
