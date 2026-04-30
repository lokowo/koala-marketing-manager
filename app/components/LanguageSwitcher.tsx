'use client';

import { useLanguage } from './LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <label htmlFor="language-select" className="font-medium text-slate-400">
        {t.common.languageLabel}:
      </label>
      <select
        id="language-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as 'en' | 'zh')}
        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
      >
        <option value="en">{t.common.english}</option>
        <option value="zh">{t.common.chinese}</option>
      </select>
    </div>
  );
}
