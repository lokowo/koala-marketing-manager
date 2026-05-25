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

function mapAuthError(msg: string): string {
  if (msg.includes('rate limit') || msg.includes('Rate limit'))
    return '操作过于频繁，请稍后再试';
  if (msg.includes('User already registered'))
    return '该邮箱已注册，请直接登录';
  if (msg.includes('Invalid login credentials'))
    return '邮箱或密码错误';
  if (msg.includes('Email not confirmed'))
    return '邮箱未验证，请先完成验证';
  return msg;
}

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
  research_interests: string[] | null;
  publications: unknown[] | null;
  target_preferences: Record<string, unknown> | null;
  profile_completed_at: string | null;
  files: Array<{ name: string; url: string; path: string; type: string; size: number; uploaded_at: string }> | null;
  role: string | null;
  role_status: string | null;
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
  const [referralInput, setReferralInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } })
        .then(r => r.json())
        .then(settings => { if (settings?.external?.google) setGoogleEnabled(true); })
        .catch(() => {});
    }

    const ua = navigator.userAgent;
    if (/MicroMessenger|WeChat|Instagram|FBAN|FBAV|Line\/|QQ\/|MQQBrowser|Weibo|Snapchat|Twitter/i.test(ua)) {
      setIsWebView(true);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError('');
      setRegistered(false);
      setEmail('');
      setPassword('');
      setName('');
      const urlRef = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null;
      setReferralInput(urlRef || '');
    }
  }, [open, tab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(mapAuthError(err.message)); return; }
    onSuccess();
    onClose();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: name || undefined,
        referralCode: referralInput || undefined,
      }),
    });

    setLoading(false);
    const d = await res.json();
    if (!res.ok) { setError(mapAuthError(d.error || '注册失败')); return; }

    setRegistered(true);
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

        {/* Value proposition */}
        <div className="text-center mb-5">
          <div className="text-2xl mb-2">🐨</div>
          <p className="text-sm leading-relaxed" style={{ color: '#a8b8ac' }}>
            登录后解锁完整功能：智能匹配导师、生成学术CV、一键发送套磁信
          </p>
        </div>

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

            {googleEnabled && !isWebView && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    const callbackUrl = new URL(`${window.location.origin}/koala/auth/callback`);
                    callbackUrl.searchParams.set('next', '/koala/chat');
                    if (referralInput) callbackUrl.searchParams.set('ref', referralInput);
                    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: callbackUrl.toString(), skipBrowserRedirect: true },
                    });
                    if (oauthErr || !data?.url) {
                      setError('Google 登录暂不可用，请使用邮箱登录');
                      return;
                    }
                    window.location.href = data.url;
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium transition mb-4"
                  style={{ background: '#fff', color: '#374151', border: '1px solid rgba(201,169,110,0.2)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.53l7.97-5.94z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.94C6.51 42.62 14.62 48 24 48z"/></svg>
                  {tab === 'register' ? 'Google 注册' : 'Google 登录'}
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: 'rgba(201,169,110,0.1)' }} />
                  <span className="text-xs" style={{ color: '#6a7a7e' }}>或</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(201,169,110,0.1)' }} />
                </div>
              </>
            )}
            {isWebView && (
              <div className="mb-4 rounded-2xl p-4" style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
                <p className="text-sm text-center mb-3" style={{ color: '#D4A843' }}>
                  当前浏览器不支持 Google 登录，请点击下方按钮在系统浏览器中打开
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex-1 py-2.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.2)' }}
                  >
                    {copied ? '已复制 ✓' : '复制链接'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { window.open(window.location.href, '_blank') || (window.location.href = window.location.href); }}
                    className="flex-1 py-2.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(212,168,67,0.25)', color: '#e8d8a0' }}
                  >
                    在浏览器中打开
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-3">
              {tab === 'register' && (
                <>
                  <input
                    type="text"
                    placeholder="你的名字（可选）"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                    style={{ background: 'rgba(201,169,110,0.06)', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.1)' }}
                  />
                  <div>
                    <input
                      type="text"
                      placeholder="邀请码（选填）"
                      value={referralInput}
                      onChange={e => setReferralInput(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="w-full px-4 py-3 rounded-2xl text-sm outline-none tracking-wider"
                      style={{ background: '#111c28', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.2)', fontFamily: 'monospace' }}
                    />
                    {referralInput && (
                      <p className="text-[10px] mt-1 px-1" style={{ color: '#5a8060' }}>🎁 注册后额外获得 5 积分</p>
                    )}
                  </div>
                </>
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
              <>
                <p className="text-center text-xs mt-3" style={{ color: '#6a7a7e' }}>
                  <a
                    href="/koala/auth/forgot-password"
                    className="no-underline"
                    style={{ color: '#c9a96e' }}
                  >
                    忘记密码？
                  </a>
                </p>
                <p className="text-center text-xs mt-2" style={{ color: '#6a7a7e' }}>
                  还没有账号？{' '}
                  <button
                    onClick={() => setTab('register')}
                    className="font-semibold underline"
                    style={{ color: '#c9a96e' }}
                  >
                    免费注册
                  </button>
                </p>
              </>
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
