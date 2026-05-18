'use client';

import { useState, useEffect } from 'react';
import { OlaAvatar } from './OlaAvatar';

interface OlaCelebrationProps {
  icon: string;
  title: string;
  description?: string;
  credits: number;
  onClose: () => void;
}

export function OlaCelebration({ icon, title, description, credits, onClose }: OlaCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    const colors = ['#c9a96e', '#0D7C5F', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const pieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti(pieces);

    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map(p => (
          <div
            key={p.id}
            className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              top: '-8px',
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative bg-white dark:bg-[#1a2332] rounded-2xl shadow-2xl p-8 max-w-xs mx-4 text-center transition-transform duration-500 ${visible ? 'scale-100' : 'scale-75'}`}
        onClick={e => e.stopPropagation()}
      >
        <OlaAvatar state="celebrate" size="lg" className="mx-auto mb-4" />

        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
        )}

        {credits > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fef3c7] dark:bg-[#78350f] rounded-full text-sm font-medium text-[#92400e] dark:text-[#fde68a] mb-4">
            +{credits} 积分已到账！
          </div>
        )}

        <button
          onClick={onClose}
          className="block w-full mt-2 px-4 py-2 text-sm font-medium bg-[#0D7C5F] text-white rounded-xl hover:bg-[#0a6a51] transition-colors"
        >
          继续
        </button>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-in forwards;
        }
      `}</style>
    </div>
  );
}
