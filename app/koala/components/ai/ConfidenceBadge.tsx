'use client';
import { useState } from 'react';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown' | 'warning';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  sourceCount?: number;
  description?: string;
  inline?: boolean;
}

const CONFIG: Record<ConfidenceLevel, {
  icon: string;
  label: string;
  defaultDesc: string;
  lightBg: string;
  darkBg: string;
  color: string;
}> = {
  high:    { icon: '🟢', label: '高置信', defaultDesc: '基于 3+ 篇论文的共识性结论', lightBg: '#f0f8f2', darkBg: '#f0f8f2', color: '#5a8060' },
  medium:  { icon: '🟡', label: '中置信', defaultDesc: '基于 1-2 篇论文，或领域一般性认知', lightBg: '#fff8e8', darkBg: '#fff8e8', color: '#D4A843' },
  low:     { icon: '🔴', label: '低置信', defaultDesc: '推理性回答，无直接论文支持', lightBg: '#fff0f0', darkBg: '#fff0f0', color: '#b06040' },
  warning: { icon: '⚠️', label: '待验证', defaultDesc: '来自一般知识，未找到可引用来源，请自行验证', lightBg: '#fff8e8', darkBg: '#fff8e8', color: '#D4A843' },
  unknown: { icon: '⚪', label: '未知', defaultDesc: '知识库中暂无相关数据', lightBg: 'rgba(212,168,67,0.06)', darkBg: 'rgba(212,168,67,0.06)', color: '#6a7a7e' },
};

export function ConfidenceBadge({ level, sourceCount, description, inline = false }: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cfg = CONFIG[level];
  const desc = description ?? (sourceCount ? `基于 ${sourceCount} 篇论文` : cfg.defaultDesc);

  if (inline) {
    return (
      <span
        className="relative inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ml-1 cursor-help"
        style={{ background: cfg.lightBg, color: cfg.color }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {cfg.icon} {cfg.label}
        {showTooltip && (
          <span className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap z-10 shadow-md bg-gray-100 dark:bg-[#e8e4dc] text-gray-700 dark:text-white min-w-[160px]">
            {desc}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 cursor-help"
      style={{ background: cfg.lightBg, border: `1px solid ${cfg.color}30` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-sm">{cfg.icon}</span>
      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
      <span className="text-[11px]" style={{ color: cfg.color, opacity: 0.7 }}>— {desc}</span>
    </div>
  );
}
