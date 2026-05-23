'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'email' | 'sent' | 'error';

export default function ProfessorClaimPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [university, setUniversity] = useState('');

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid university email address');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/professor/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong');
        setStep('error');
        setLoading(false);
        return;
      }
      setProfessorName(data.professorName || '');
      setUniversity(data.university || '');
      setStep('sent');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="size-9 rounded-full bg-[#1A1A2E] flex items-center justify-center text-white text-sm font-bold">K</div>
          <div>
            <span className="text-sm font-semibold text-gray-900">Koala PhD</span>
            <span className="text-xs text-gray-400 ml-2">Professor Portal</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {step === 'email' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Claim Your Academic Profile</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Koala PhD has created an academic profile for you based on public research data.
                  Verify your identity to edit your information and view student match recommendations.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">University email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="name@university.edu.au"
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                    disabled={loading}
                  />
                  {errorMsg && <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !email}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-[#1A1A2E] text-white hover:bg-[#2a2a3e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-medium text-gray-600 mb-2">After verification you can:</h3>
                <ul className="space-y-1.5">
                  {[
                    'Edit your research profile and contact preferences',
                    'See which students are interested in your research',
                    'Review cold email letters from prospective students',
                    'Post PhD positions and scholarship opportunities',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 'sent' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="m22 2-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Verification Code Sent</h2>
              {professorName && (
                <p className="text-sm text-gray-600 mt-1">
                  Welcome, <span className="font-medium">{professorName}</span>
                  {university ? ` from ${university}` : ''}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                We&apos;ve sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
                Please check your inbox (and spam folder) and enter the code on the{' '}
                <Link href="/koala/professor-portal" className="text-blue-600 hover:underline">
                  Professor Portal
                </Link>{' '}
                to complete verification.
              </p>
              <Link
                href="/koala/professor-portal"
                className="inline-block mt-5 px-6 py-2.5 rounded-lg text-sm font-medium no-underline bg-[#1A1A2E] text-white hover:bg-[#2a2a3e] transition-colors"
              >
                Go to Professor Portal →
              </Link>
            </div>
          )}

          {step === 'error' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Could Not Verify</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => { setStep('email'); setErrorMsg(''); }}
                className="mt-5 px-6 py-2.5 rounded-lg text-sm font-medium bg-[#1A1A2E] text-white hover:bg-[#2a2a3e] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-400 mt-6">
            Questions? Contact{' '}
            <a href="mailto:info@koalaphd.com" className="text-blue-500 hover:underline">info@koalaphd.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}
