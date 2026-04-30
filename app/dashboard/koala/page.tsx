'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageContext';
import type { Professor, Grant, ContentCard, Task } from '../../lib/types';

function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function KoalaDashboard() {
  const { t } = useLanguage();
  const td = t.dashboard;

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [contentCards, setContentCards] = useState<ContentCard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch('/api/professors').then(r => r.json()).then(({ data }) => setProfessors(data.slice(0, 3)));
    fetch('/api/grants').then(r => r.json()).then(({ data }) => setGrants(data.slice(0, 3)));
    fetch('/api/content/cards').then(r => r.json()).then(({ data }) => {
      setContentCards((data as ContentCard[]).filter(c => c.status === 'Pending'));
    });
  }, []);

  // Tasks come from store — use professors/grants API to seed, tasks stay in store
  useEffect(() => {
    // Fetch tasks directly from the store via a simple approach
    // Since there's no /api/tasks route, we keep tasks as static for now
    setTasks([
      { id: '1', title: 'Publish Xiaohongshu post', dueDate: '', status: 'In Progress' },
      { id: '2', title: 'Schedule WeChat article', dueDate: '', status: 'Pending' },
      { id: '3', title: 'Review LinkedIn content', dueDate: '', status: 'Pending' },
    ]);
  }, []);

  const weekDates = getCurrentWeekDates();
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Today's Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{td.todaysTasks}</h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{task.title}</span>
              <span className={`px-2 py-1 rounded text-sm ${
                task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {task.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{td.weeklyCalendar}</h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div key={index} className={`text-center p-2 rounded ${isToday ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50'}`}>
                <div className="text-sm font-medium">{td.dayNames[index]}</div>
                <div className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>{date.getDate()}</div>
                {index % 2 === 0 && <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" />}
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Pending Content Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{td.pendingContentCards}</h3>
        {contentCards.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending cards.</p>
        ) : (
          <div className="space-y-2">
            {contentCards.map((card) => (
              <div key={card.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <span>{card.title}</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">{card.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
