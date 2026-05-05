'use client';

import { useState } from 'react';
import { Heart, Send, Inbox, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'mutual', label: '互相感兴趣', icon: Sparkles },
  { id: 'saved', label: '已收藏', icon: Heart },
  { id: 'sent', label: '已发送', icon: Send },
  { id: 'olive', label: '橄榄枝', icon: Inbox },
] as const;

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState('saved');
  return (
    <div className="px-4 pt-4">
      <h1 className="text-lg font-semibold mb-4" style={{ color: '#e8e4dc' }}>我的匹配</h1>
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs whitespace-nowrap" style={{ background: active ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.04)', color: active ? '#c9a96e' : '#6a7a7e', border: '1px solid ' + (active ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)') }}>
              <Icon className="size-3.5" />{tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">🐨</span>
        <p className="text-sm" style={{ color: '#8a9a8e' }}>
          {activeTab === 'saved' && '右滑收藏的教授会出现在这里'}
          {activeTab === 'sent' && '已发送的申请信会出现在这里'}
          {activeTab === 'mutual' && '当教授也对你感兴趣时会出现在这里'}
          {activeTab === 'olive' && '教授发给你的橄榄枝会出现在这里'}
        </p>
      </div>
    </div>
  );
}
