'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BlogScheduledPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/koala/blog?tab=scheduled'); }, [router]);
  return <div className="p-8 text-center text-slate-500">加载中...</div>;
}
