'use client';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  reward?: string;
}

interface DailyTaskProps {
  tasks: Task[];
  streak?: number;
  onComplete?: (taskId: string) => void;
}

export function DailyTask({ tasks, streak = 0, onComplete }: DailyTaskProps) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)' }}>
      <button
        className="w-full flex items-center justify-between p-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <div className="text-left">
            <div className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>每日任务</div>
            <div className="text-[11px]" style={{ color: '#6a7a7e' }}>
              {completedCount}/{tasks.length} 已完成 · 连续 {streak} 天
            </div>
          </div>
        </div>
        <div
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: '#f5e8c4', color: '#c9a96e' }}
        >
          {completedCount === tasks.length ? '全部完成 🎉' : `还差 ${tasks.length - completedCount} 个`}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(201,169,110,0.06)' }}>
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-2.5 pt-2"
            >
              <button
                onClick={() => !task.completed && onComplete?.(task.id)}
                className="flex-shrink-0 size-5 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: task.completed ? '#c9a96e' : '#d8c8a8',
                  background: task.completed ? '#c9a96e' : 'transparent',
                }}
              >
                {task.completed && <span className="text-[10px] text-white">✓</span>}
              </button>
              <span
                className="flex-1 text-xs leading-snug"
                style={{
                  color: task.completed ? '#b09878' : '#28201a',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}
              >
                {task.title}
              </span>
              {task.reward && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
                  +{task.reward}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
