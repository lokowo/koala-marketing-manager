'use client';

import { useEffect, useState, useRef, use } from 'react';
import dynamic from 'next/dynamic';
import { generateDeviceFingerprint } from '../../lib/services/deviceFingerprint';
import '../survey-dark-theme.css';

const SurveyRenderer = dynamic(
  () => import('../../components/survey/SurveyRenderer'),
  { ssr: false, loading: () => <div className="min-h-screen bg-[#080C10] flex items-center justify-center"><span className="text-gray-500 text-sm">加载问卷中...</span></div> }
);

interface SurveyData {
  survey_id: string;
  title: string;
  description?: string;
  survey_json?: Record<string, unknown>;
  sales_user_id?: string;
  share_link_id?: string;
}

type ErrorType = 'not_found' | 'ended' | 'already_filled' | 'network' | null;

export default function PublicSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ name: string; email: string; phone: string } | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/surveys/public/${code}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error || '';
          if (res.status === 404) { setErrorType('not_found'); setErrorMsg(msg || '问卷不存在'); }
          else if (msg.includes('已结束')) { setErrorType('ended'); setErrorMsg(msg); }
          else if (msg.includes('已暂停')) { setErrorType('ended'); setErrorMsg(msg); }
          else { setErrorType('network'); setErrorMsg(msg || '加载失败'); }
          return;
        }
        const data = await res.json();
        setSurvey(data);

        const fingerprint = generateDeviceFingerprint();
        const respondRes = await fetch(`/api/surveys/public/${code}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_fingerprint: fingerprint }),
        });

        if (respondRes.ok) {
          const { response_id } = await respondRes.json();
          setResponseId(response_id);
        }
      } catch {
        setErrorType('network');
        setErrorMsg('网络连接失败');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [code]);

  async function handlePartialSave(data: Record<string, unknown>, pageNo: number) {
    if (!responseId) return;
    try {
      await fetch(`/api/surveys/public/${code}/respond/${responseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: data, current_page: pageNo }),
      });
    } catch { /* silent */ }
  }

  async function handleComplete(results: Record<string, unknown>) {
    if (!responseId) return;

    try {
      const contact = {
        name: (results.__contact_name as string) || '',
        phone: (results.__contact_phone as string) || '',
        email: (results.__contact_email as string) || '',
      };
      setContactInfo(contact);

      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const answers = { ...results, __duration: duration };

      const res = await fetch(`/api/surveys/public/${code}/respond/${responseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrorType('already_filled');
          setErrorMsg('你已经提交过这份问卷了');
          return;
        }
        throw new Error(data.error || '提交失败');
      }

      setSurveyCompleted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败，请重试');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
        <div className="text-gray-500 text-sm">加载问卷中...</div>
      </div>
    );
  }

  if (errorType) {
    return <ErrorPage type={errorType} message={errorMsg} onRetry={errorType === 'network' ? () => window.location.reload() : undefined} />;
  }

  if (!survey?.survey_json) {
    return <ErrorPage type="network" message="问卷数据加载异常" />;
  }

  if (surveyCompleted) {
    return (
      <ThankYouPage
        contactInfo={contactInfo}
        registeredUserId={registeredUserId}
        shareCode={code}
        responseId={responseId || ''}
        onRegistered={setRegisteredUserId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080C10] flex flex-col">
      <header className="border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🐨</span>
        <span className="text-sm font-medium text-white/80">Koala PhD</span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <SurveyRenderer
          surveyJson={survey.survey_json}
          onComplete={handleComplete}
          onPartialSave={handlePartialSave}
          shareCode={code}
          responseId={responseId || undefined}
          onRegistered={setRegisteredUserId}
        />
        {submitError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-4 text-center">
        <span className="text-xs text-white/20">Powered by Koala PhD · 保密处理 · © 2026</span>
      </footer>
    </div>
  );
}

function ErrorPage({ type, message, onRetry }: { type: ErrorType; message: string; onRetry?: () => void }) {
  const icons: Record<string, string> = { not_found: '🔍', ended: '📋', already_filled: '✅', network: '🔄' };
  const titles: Record<string, string> = {
    not_found: '问卷不存在',
    ended: '问卷已结束',
    already_filled: '您已参与过此问卷',
    network: '加载失败',
  };

  return (
    <div className="min-h-screen bg-[#080C10] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">{icons[type || 'network']}</div>
        <h2 className="text-lg font-bold text-white mb-2">{titles[type || 'network']}</h2>
        <p className="text-sm text-gray-400 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 rounded-lg text-sm font-medium text-[#080C10]"
            style={{ backgroundColor: '#D4A843' }}
          >
            重新加载
          </button>
        )}
        <p className="text-xs text-gray-600 mt-6">如有疑问请联系 Koala Study Advisors</p>
      </div>
    </div>
  );
}

function ThankYouPage({ contactInfo, registeredUserId, shareCode, responseId, onRegistered }: {
  contactInfo: { name: string; email: string; phone: string } | null;
  registeredUserId: string | null;
  shareCode: string;
  responseId: string;
  onRegistered: (userId: string) => void;
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [password, setPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(!!registeredUserId);

  async function handleRegister() {
    if (!contactInfo?.email) return;
    if (!password || password.length < 6) {
      setRegisterError('密码至少6位');
      return;
    }
    setRegisterLoading(true);
    setRegisterError('');
    try {
      const res = await fetch(`/api/surveys/public/${shareCode}/respond/${responseId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contactInfo.email,
          password,
          full_name: contactInfo.name,
          phone: contactInfo.phone,
        }),
      });
      if (res.status === 409) {
        setRegisterSuccess(true);
        onRegistered('existing');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '注册失败');
      }
      const data = await res.json();
      setRegisterSuccess(true);
      onRegistered(data.user_id || 'registered');
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080C10] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#0F1419] rounded-2xl border border-white/10 p-8 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-xl font-bold text-white">感谢你的回答！</h1>
        <p className="text-sm text-gray-400">
          你的反馈对我们非常重要，我们会认真阅读每一份回复。
        </p>

        {!registerSuccess && contactInfo?.email && (
          <div className="bg-[#D4A843]/5 border border-[#D4A843]/20 rounded-xl p-4 space-y-3 text-left">
            {!showRegister ? (
              <>
                <p className="text-sm font-medium text-[#D4A843]">注册 Koala 账号，获得 20 积分奖励</p>
                <p className="text-xs text-gray-400">积分可用于解锁 AI 教授匹配等高级功能</p>
                <button
                  onClick={() => setShowRegister(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#080C10]"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  使用 {contactInfo.email} 注册
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">邮箱: <strong className="text-white">{contactInfo.email}</strong></p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="设置密码（至少6位）"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4A843]/50"
                />
                {registerError && <p className="text-xs text-red-400">{registerError}</p>}
                <button
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className="w-full py-2 rounded-lg text-sm font-medium text-[#080C10] disabled:opacity-50"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  {registerLoading ? '注册中...' : '注册并领取 20 积分'}
                </button>
                <button
                  onClick={() => setShowRegister(false)}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1"
                >
                  暂不注册
                </button>
              </div>
            )}
          </div>
        )}

        {registerSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-sm text-green-400 font-medium">
                {registeredUserId === 'existing' ? '该邮箱已注册，请直接登录' : '注册成功！20 积分已到账'}
              </span>
            </div>
            <a
              href="https://koalaphd.com"
              target="_blank"
              rel="noopener"
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium text-[#080C10] no-underline"
              style={{ backgroundColor: '#D4A843' }}
            >
              进入 Koala PhD 平台
            </a>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-white/80">想了解更多？</p>
          <p className="text-xs text-gray-500">
            Koala Study Advisors — 澳洲领先的产学研科研机构
          </p>
          <a
            href="https://koalastudy.net"
            target="_blank"
            rel="noopener"
            className="inline-block px-4 py-2 rounded-lg text-xs text-[#D4A843] border border-[#D4A843]/30 no-underline mt-1 hover:bg-[#D4A843]/10"
          >
            访问 Koala
          </a>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <span>微信: KoalaStudy</span>
            <span>小红书: @dr.koalaau</span>
          </div>
        </div>
      </div>
    </div>
  );
}
