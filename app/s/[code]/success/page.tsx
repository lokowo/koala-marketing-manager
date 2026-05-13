'use client';

import { use } from 'react';

export default function SurveySuccessPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-xl font-bold text-slate-800">感谢你的回答！</h1>
        <p className="text-sm text-slate-500">
          你的反馈对我们非常重要，我们会认真阅读每一份回复。
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">想了解更多？</p>
          <p className="text-xs text-amber-600">
            Koala Study Advisors 是澳洲领先的产学研科研机构，帮助你从申请到毕业，每一步都在。
          </p>
          <a
            href="/koala/home"
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

        <p className="text-xs text-slate-300">
          问卷代码: {code}
        </p>
      </div>
    </div>
  );
}
