'use client';

import { useState, useEffect } from 'react';

interface Stats {
  users: { total: number; today: number };
  professors: number;
  knowledgeChunks: number;
  blog: { published: number; draft: number };
  chat: { today: number; month: number };
}

export default function KoalaDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats);
  }, []);

  const cards = stats ? [
    { label: '注册用户', value: stats.users.total, sub: `今日 +${stats.users.today}`, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: '教授总数', value: stats.professors, sub: `知识库 ${stats.knowledgeChunks} chunks`, icon: '👨‍🏫', color: 'bg-purple-50 text-purple-700' },
    { label: '博客文章', value: stats.blog.published + stats.blog.draft, sub: `已发布 ${stats.blog.published} / 草稿 ${stats.blog.draft}`, icon: '📝', color: 'bg-green-50 text-green-700' },
    { label: 'AI 对话', value: stats.chat.month, sub: `今日 ${stats.chat.today}`, icon: '💬', color: 'bg-amber-50 text-amber-700' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">仪表盘</h2>
        <p className="text-sm text-gray-500 mt-1">Koala PhD 运营概览</p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">{card.label}</span>
                <span className={`text-xl w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/dashboard/koala/ai-content" className="p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition text-center">
              <span className="text-2xl block mb-1">✨</span>
              <span className="text-sm font-medium text-gray-700">AI 生成文章</span>
            </a>
            <a href="/dashboard/koala/blog" className="p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition text-center">
              <span className="text-2xl block mb-1">📝</span>
              <span className="text-sm font-medium text-gray-700">博客管理</span>
            </a>
            <a href="/dashboard/koala/professors" className="p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition text-center">
              <span className="text-2xl block mb-1">👨‍🏫</span>
              <span className="text-sm font-medium text-gray-700">教授库</span>
            </a>
            <a href="/dashboard/koala/users" className="p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition text-center">
              <span className="text-2xl block mb-1">👥</span>
              <span className="text-sm font-medium text-gray-700">用户管理</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">AI 服务</span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">正常</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">数据库</span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">正常</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">知识库更新</span>
              <span className="text-xs text-gray-500">{stats ? `${stats.knowledgeChunks} chunks` : '-'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">教授数据覆盖</span>
              <span className="text-xs text-gray-500">{stats ? `${stats.professors} 位教授` : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
