'use client';

import { useState, useEffect } from 'react';
import { MapPin, BookOpen, Heart, Sparkles, Unlock, Mail, X } from 'lucide-react';

interface MatchProfile {
  userId: string;
  city: string | null;
  interests: string[] | null;
  lookingFor: string | null;
  olaDescription: string | null;
  displayName: string;
  university: string | null;
  targetField: string | null;
  degreeLevel: string | null;
}

interface MatchProfileCardProps {
  targetUserId: string;
  onAction: (action: string, targetUserId: string) => void;
}

export function MatchProfileCard({ targetUserId, onAction }: MatchProfileCardProps) {
  const [profile, setProfile] = useState<MatchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ola/matchmaking')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const match = data?.matches?.find((m: MatchProfile) => m.userId === targetUserId);
        setProfile(match ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetUserId]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      onAction(action, targetUserId);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800/30 animate-pulse">
        <div className="h-4 bg-pink-200 dark:bg-pink-800/30 rounded w-24 mb-2" />
        <div className="h-3 bg-pink-100 dark:bg-pink-800/20 rounded w-full mb-1" />
        <div className="h-3 bg-pink-100 dark:bg-pink-800/20 rounded w-3/4" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-pink-200 dark:border-pink-800/30 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="px-3 py-2 bg-pink-100/50 dark:bg-pink-900/30 flex items-center gap-2">
        <Sparkles className="size-3.5 text-pink-500" />
        <span className="text-[11px] font-semibold text-pink-600 dark:text-pink-400">
          学姐推荐认识
        </span>
      </div>

      {/* Profile info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
            {profile.displayName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">
              {profile.displayName}
            </div>
            {profile.university && (
              <div className="text-[10px] text-gray-500 dark:text-[#8a8078]">
                {profile.university}{profile.degreeLevel ? ` · ${profile.degreeLevel}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          {profile.city && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[10px] text-blue-600 dark:text-blue-400">
              <MapPin className="size-2.5" />{profile.city}
            </span>
          )}
          {profile.targetField && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[10px] text-green-600 dark:text-green-400">
              <BookOpen className="size-2.5" />{profile.targetField}
            </span>
          )}
          {(profile.interests ?? []).slice(0, 3).map(i => (
            <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[10px] text-purple-600 dark:text-purple-400">
              <Heart className="size-2.5" />{i}
            </span>
          ))}
        </div>

        {/* Ola's description */}
        {profile.olaDescription && (
          <p className="text-[11px] text-gray-600 dark:text-[#b0a898] italic leading-relaxed">
            &ldquo;{profile.olaDescription}&rdquo; — 学姐评价
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => handleAction('unlock_profile')}
          disabled={actionLoading === 'unlock_profile'}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-pink-500 dark:bg-pink-600 text-white text-[11px] font-medium hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors disabled:opacity-50"
        >
          <Unlock className="size-3" />
          {actionLoading === 'unlock_profile' ? '处理中...' : '解锁完整资料 10积分'}
        </button>
        <button
          onClick={() => handleAction('generate_letter')}
          disabled={actionLoading === 'generate_letter'}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-500 dark:bg-purple-600 text-white text-[11px] font-medium hover:bg-purple-600 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Mail className="size-3" />
          {actionLoading === 'generate_letter' ? '处理中...' : '让学姐写信介绍 20积分'}
        </button>
        <button
          onClick={() => handleAction('decline')}
          className="flex items-center justify-center px-2 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-[#8a8078] text-[11px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          title="不感兴趣"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
