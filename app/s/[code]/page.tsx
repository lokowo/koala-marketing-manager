'use client';

import { useEffect, useState, useRef, use } from 'react';
import dynamic from 'next/dynamic';
import { generateDeviceFingerprint } from '../../lib/services/deviceFingerprint';

const SurveyRenderer = dynamic(
  () => import('../../components/survey/SurveyRenderer'),
  { ssr: false, loading: () => <div className="min-h-screen bg-slate-50 flex items-center justify-center"><span className="text-slate-400 text-sm">加载问卷中...</span></div> }
);

interface SurveyData {
  id: string;
  title: string;
  survey_json?: Record<string, unknown>;
}

export default function PublicSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ name: string; email: string; phone: string; wechat?: string } | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/surveys/public?code=${code}&ref=${code}`)
      .then(async r => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || '问卷不存在');
        }
        return r.json();
      })
      .then(data => setSurvey(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleComplete(results: Record<string, unknown>) {
    if (!survey) return;

    try {
      const fingerprint = generateDeviceFingerprint();
      const duration = Math.round((Date.now() - startTime.current) / 1000);

      const contact = {
        name: (results.__contact_name as string) || '',
        phone: (results.__contact_phone as string) || '',
        email: (results.__contact_email as string) || '',
        wechat: (results.__contact_wechat as string) || undefined,
      };
      setContactInfo(contact);

      const answers = { ...results };
      delete answers.__contact_name;
      delete answers.__contact_phone;
      delete answers.__contact_email;
      delete answers.__contact_wechat;

      const res = await fetch('/api/surveys/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          answers,
          device_fingerprint: fingerprint,
          metadata: {
            duration_seconds: duration,
            user_agent: navigator.userAgent,
            contact_name: contact.name,
            contact_phone: contact.phone,
            contact_email: contact.email,
            contact_wechat: contact.wechat,
          },
          sales_code: code,
          respondent_id: registeredUserId && registeredUserId !== 'existing' ? registeredUserId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSubmitError('你已经提交过这份问卷了');
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">加载问卷中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">😥</div>
          <p className="text-slate-600 text-sm">{error}</p>
          <p className="text-xs text-slate-400 mt-2">如有疑问请联系 Koala Study Advisors</p>
        </div>
      </div>
    );
  }

  if (!survey?.survey_json) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😥</div>
          <p className="text-slate-600 text-sm">问卷数据加载异常</p>
        </div>
      </div>
    );
  }

  if (surveyCompleted) {
    return <ThankYouPage contactInfo={contactInfo} registeredUserId={registeredUserId} salesCode={code} onRegistered={setRegisteredUserId} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <SurveyRenderer
          surveyJson={survey.survey_json}
          onComplete={handleComplete}
          salesCode={code}
          onRegistered={setRegisteredUserId}
        />
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
        <div className="text-center mt-6">
          <span className="text-xs text-slate-300">Powered by Koala Study Advisors</span>
        </div>
      </div>
    </div>
  );
}

function ThankYouPage({ contactInfo, registeredUserId, salesCode, onRegistered }: {
  contactInfo: { name: string; email: string; phone: string; wechat?: string } | null;
  registeredUserId: string | null;
  salesCode: string;
  onRegistered: (userId: string) => void;
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(!!registeredUserId);

  async function handleRegister() {
    if (!contactInfo?.email) return;
    if (!password || password.length < 8) {
      setRegisterError('密码至少8位');
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError('两次密码不一致');
      return;
    }
    setRegisterLoading(true);
    setRegisterError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contactInfo.email,
          password,
          name: contactInfo.name,
          salesCode,
          dataConsent: true,
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
      setRegisterSuccess(true);
      onRegistered('registered');
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-xl font-bold text-slate-800">感谢你的回答！</h1>
        <p className="text-sm text-slate-500">
          你的反馈对我们非常重要，我们会认真阅读每一份回复。
        </p>

        {!registerSuccess && contactInfo?.email && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-left">
            <p className="text-sm font-medium text-amber-800">注册 Koala 账号，获取更多学术资源</p>
            {!showRegister ? (
              <button
                onClick={() => setShowRegister(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#D4A843' }}
              >
                使用 {contactInfo.email} 注册
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">邮箱: <strong>{contactInfo.email}</strong></p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="设置密码（至少8位）"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="确认密码"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                {registerError && <p className="text-xs text-red-500">{registerError}</p>}
                <button
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  {registerLoading ? '注册中...' : '一键注册'}
                </button>
                <p className="text-xs text-slate-400">注册即表示同意我们的服务条款和隐私政策</p>
              </div>
            )}
          </div>
        )}

        {registerSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-sm text-green-700 font-medium">
                {registeredUserId === 'existing' ? '该邮箱已注册，请直接登录' : '账号已创建！验证邮件已发送'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">想了解更多？</p>
          <p className="text-xs text-slate-500">
            Koala Study Advisors 是澳洲领先的产学研科研机构，帮助你从申请到毕业，每一步都在。
          </p>
          <a
            href="https://koalastudy.net"
            target="_blank"
            rel="noopener"
            className="inline-block px-4 py-2 rounded-lg text-sm text-white no-underline mt-1"
            style={{ backgroundColor: '#D4A843' }}
          >
            访问 Koala
          </a>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span>微信: KoalaStudy</span>
            <span>小红书: @dr.koalaau</span>
          </div>
        </div>
      </div>
    </div>
  );
}
