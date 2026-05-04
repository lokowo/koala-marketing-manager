'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Share2, Copy, Check } from 'lucide-react';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  excerpt_zh: string | null;
  content_zh: string | null;
  content_en: string | null;
  category: string;
  author: string;
  reading_time: number;
  published_at: string;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  phd_guide: 'PhD指南', application: '申请攻略', scholarship: '奖学金',
  visa: '签证攻略', supervisor: '导师关系', research: '科研方法',
  student_life: '留学生活', news: '行业新闻',
};

export default function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/blog?public=true&limit=50`)
      .then(r => r.json())
      .then(data => {
        const found = data.posts?.find((p: BlogPost) => p.id === id);
        setPost(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function getShareUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  function copyLink() {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareTwitter() {
    const url = getShareUrl();
    const text = post?.title_zh || post?.title_en || '';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  function shareLinkedIn() {
    const url = getShareUrl();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  }

  if (loading) {
    return (
      <div style={{ background: '#faf6ec', minHeight: '100vh' }} className="flex items-center justify-center">
        <p className="text-sm" style={{ color: '#907858' }}>加载中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ background: '#faf6ec', minHeight: '100vh' }} className="flex flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: '#907858' }}>文章不存在</p>
        <Link href="/koala/blog" className="text-sm" style={{ color: '#c4a050' }}>← 返回博客</Link>
      </div>
    );
  }

  const content = post.content_zh || post.content_en || '';

  return (
    <div style={{ background: '#faf6ec', minHeight: '100vh', paddingBottom: 120 }}>
      {/* Header */}
      <div className="flex px-4 pt-4 pb-2 items-center justify-between sticky top-0 z-10" style={{ background: '#faf6ec' }}>
        <Link href="/koala/blog" className="size-9 rounded-full flex items-center justify-center" style={{ background: '#f0e9d6' }}>
          <ChevronLeft className="size-5" style={{ color: '#1a2332' }} />
        </Link>
        <button
          onClick={() => setShowShare(!showShare)}
          className="size-9 rounded-full flex items-center justify-center"
          style={{ background: '#f0e9d6' }}
        >
          <Share2 className="size-4" style={{ color: '#c4a050' }} />
        </button>
      </div>

      {/* Share Panel */}
      {showShare && (
        <div className="mx-4 mb-4 p-4 rounded-2xl" style={{ background: '#fff', boxShadow: '0 4px 16px rgba(196,160,80,0.12)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#1a2332' }}>分享文章</p>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={copyLink} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: copied ? '#d1fae5' : '#f0e9d6' }}>
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" style={{ color: '#c4a050' }} />}
              </div>
              <span className="text-[10px]" style={{ color: '#584838' }}>{copied ? '已复制' : '复制链接'}</span>
            </button>
            <button onClick={() => {
              const url = getShareUrl();
              window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(post.title_zh || '')}`, '_blank');
            }} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: '#e6f7e6' }}>
                <span className="text-lg">💬</span>
              </div>
              <span className="text-[10px]" style={{ color: '#584838' }}>微信</span>
            </button>
            <button onClick={shareTwitter} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: '#e8f4fd' }}>
                <span className="text-lg">𝕏</span>
              </div>
              <span className="text-[10px]" style={{ color: '#584838' }}>Twitter</span>
            </button>
            <button onClick={shareLinkedIn} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: '#e8f0fa' }}>
                <span className="text-lg">in</span>
              </div>
              <span className="text-[10px]" style={{ color: '#584838' }}>LinkedIn</span>
            </button>
          </div>
        </div>
      )}

      {/* Article */}
      <article className="px-5 lg:px-0 lg:max-w-2xl lg:mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0e9d6', color: '#8a6c30' }}>
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <span className="text-xs" style={{ color: '#907858' }}>
            {post.reading_time} min · {new Date(post.published_at).toLocaleDateString('zh-CN')}
          </span>
        </div>

        <h1 className="text-xl font-bold leading-tight mb-3" style={{ color: '#1a2332' }}>
          {post.title_zh || post.title_en}
        </h1>

        <div className="flex items-center gap-2 mb-6">
          <div className="size-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#c4a050' }}>
            {(post.author || 'K')[0]}
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>{post.author}</span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f0e9d6', color: '#584838' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content - simple markdown rendering */}
        <div
          className="prose prose-sm max-w-none"
          style={{ color: '#1a2332', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Bottom share bar */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e8dcc8' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#584838' }}>觉得有帮助？分享给朋友</p>
          <div className="flex gap-2">
            <button onClick={copyLink} className="px-4 py-2 text-xs rounded-full flex items-center gap-1.5" style={{ background: '#f0e9d6', color: '#584838' }}>
              <Copy className="size-3" /> {copied ? '已复制' : '复制链接'}
            </button>
            <button onClick={shareTwitter} className="px-4 py-2 text-xs rounded-full" style={{ background: '#f0e9d6', color: '#584838' }}>
              𝕏 Twitter
            </button>
            <button onClick={shareLinkedIn} className="px-4 py-2 text-xs rounded-full" style={{ background: '#f0e9d6', color: '#584838' }}>
              LinkedIn
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: '#1a2332' }}>
          <p className="text-sm font-medium" style={{ color: '#e8dcc8' }}>想了解更多？让 Koala AI 帮你</p>
          <Link href="/koala/chat" className="mt-2 inline-block text-xs px-4 py-2 rounded-full no-underline font-medium" style={{ background: '#c4a050', color: '#1a2332' }}>
            开始对话 →
          </Link>
        </div>
      </article>
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-5 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(?!<)(.+)$/gm, '<p class="mb-3">$1</p>');
}
