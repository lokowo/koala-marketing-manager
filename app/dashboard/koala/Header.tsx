'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '../../components/LanguageContext';

export default function Header() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const titles = t.header.titles;
  const title = titles[pathname as keyof typeof titles] || titles['/dashboard/koala'];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
    </header>
  );
}