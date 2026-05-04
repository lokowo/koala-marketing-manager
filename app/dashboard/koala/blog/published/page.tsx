'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BlogPublishedPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/koala/blog?tab=published'); }, [router]);
  return <div className="p-8 text-center text-gray-500">加载中...</div>;
}
