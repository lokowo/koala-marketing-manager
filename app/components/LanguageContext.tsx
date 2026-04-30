'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_KEY, defaultLanguage, Language, translations } from '../lib/i18n';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations[Language];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (stored === 'en' || stored === 'zh') {
      setLang(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, lang);
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: translations[lang] }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
