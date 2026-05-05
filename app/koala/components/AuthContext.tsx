'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  university: string | null;
  major: string | null;
  degree_level: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  target_field: string | null;
  target_universities: string[] | null;
  english_level: string | null;
  has_research_experience: boolean | null;
  research_description: string | null;
  has_publications: boolean | null;
  publication_details: string | null;
  resume_url: string | null;
  transcript_url: string | null;
  parsed_data: object | null;
  file_name: string | null;
  profile_completeness: number;
  plan_type: 'free' | 'starter' | 'pro' | 'elite';
  credits_remaining: number;
  // Extended profile fields
  english_test_type: string | null;
  english_scores: { overall?: number; writing?: number; speaking?: number; reading?: number; listening?: number } | null;
  strengths: string[] | null;
  career_goal: string | null;
  preferred_city: string[] | null;
  budget: string | null;
  start_semester: string | null;
  personality_tags: string[] | null;
  language_preference: string | null;
  work_experience: string | null;
  files: Array<{ name: string; url: string; path: string; type: string; size: number; uploaded_at: string }> | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  showLogin: (onSuccess?: () => void) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  authLoading: true,
  showLogin: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────
// Login / Register Modal
// ─────────────────────────────────────────────

function LoginModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setRegistered(false);
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [open, tab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSuccess();
    onClose();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name || email.split('@')[0] } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }

    // If auto-confirm is off, session will be null → show "check email" message
    if (data.session) {
      onSuccess();
      onClose();
    } else {
      setRegistered(true);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      style={{ background: 'rgba(26,35,50,0.55)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl px-6 pt-6 pb-10"
        style={{ background: '#080c10', maxWidth: 480, width: '100%', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#d8c8a8' }} />

        {registered ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-base font-bold mb-2" style={{ color: '#e8e4dc' }}>请检查你的邮箱</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6a7a7e' }}>
              我们已向 <strong>{email}</strong> 发送了验证邮件，点击链接后即可登录。
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-full text-sm font-semibold"
              style={{ background: '#c9a96e', color: '#080c10' }}
            >
              好的
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex rounded-2xl p-1 mb-6" style={{ background: 'rgba(201,169,110,0.06)' }}>
              {(['login', 'register'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: tab === t ? '#c9a96e' : 'transparent',
                    color: tab === t ? '#fff' : '#6a7a7e',
                  }}
                >
                  {t === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>

            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-3">
              {tab === 'register' && (
                <input
                  type="text"
                  placeholder="你的名字（可选）"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{ background: 'rgba(201,169,110,0.06)', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.1)' }}
                />
              )}
              <input
                type="email"
                placeholder="邮箱"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: 'rgba(201,169,110,0.06)', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.1)' }}
              />
              <input
                type="password"
                placeholder="密码（至少6位）"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: 'rgba(201,169,110,0.06)', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.1)' }}
              />
              {error && (
                <p className="text-xs px-1" style={{ color: '#b06040' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full text-sm font-semibold text-white mt-2"
                style={{ background: loading ? '#d8c8a8' : '#c9a96e' }}
              >
                {loading ? '处理中…' : tab === 'login' ? '登录' : '注册'}
              </button>
            </form>

            {tab === 'login' && (
              <p className="text-center text-xs mt-4" style={{ color: '#6a7a7e' }}>
                还没有账号？{' '}
                <button
                  onClick={() => setTab('register')}
                  className="font-semibold underline"
                  style={{ color: '#c9a96e' }}
                >
                  免费注册
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const pendingCallback = useRef<(() => void) | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) loadProfile();
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const showLogin = useCallback((onSuccess?: () => void) => {
    pendingCallback.current = onSuccess ?? null;
    setModalOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  function handleModalSuccess() {
    loadProfile();
    if (pendingCallback.current) {
      pendingCallback.current();
      pendingCallback.current = null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, authLoading, showLogin, signOut, refreshProfile }}>
      {children}
      <LoginModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </AuthContext.Provider>
  );
}
