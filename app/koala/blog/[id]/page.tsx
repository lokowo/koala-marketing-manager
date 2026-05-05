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
  reading_time_zh: number;
  published_at: string;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
  professor_spotlight: '教授推荐',
};

export default function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/${id}`)
      .then(r => r.json())
      .then(data => {
        setPost(data.post || null);
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

  function copyForWechat() {
    navigator.clipboard.writeText(getShareUrl());
    setWechatCopied(true);
    setTimeout(() => setWechatCopied(false), 3000);
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
      <div style={{ background: '#080c10', minHeight: '100vh' }} className="flex items-center justify-center">
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ background: '#080c10', minHeight: '100vh' }} className="flex flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: '#6a7a7e' }}>文章不存在</p>
        <Link href="/koala/blog" className="text-sm" style={{ color: '#c9a96e' }}>← 返回博客</Link>
      </div>
    );
  }

  const content = post.content_zh || post.content_en || '';

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 120 }}>
      {/* Header */}
      <div className="flex px-4 pt-4 pb-2 items-center justify-between sticky top-0 z-10" style={{ background: '#080c10' }}>
        <Link href="/koala/blog" className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.06)' }}>
          <ChevronLeft className="size-5" style={{ color: '#e8e4dc' }} />
        </Link>
        <button
          onClick={() => setShowShare(!showShare)}
          className="size-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(201,169,110,0.06)' }}
        >
          <Share2 className="size-4" style={{ color: '#c9a96e' }} />
        </button>
      </div>

      {/* Share Panel */}
      {showShare && (
        <div className="mx-4 mb-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 16px rgba(196,160,80,0.12)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#e8e4dc' }}>分享文章</p>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={copyLink} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: copied ? '#d1fae5' : 'rgba(201,169,110,0.06)' }}>
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" style={{ color: '#c9a96e' }} />}
              </div>
              <span className="text-[10px]" style={{ color: '#a8b8ac' }}>{copied ? '已复制' : '复制链接'}</span>
            </button>
            <button onClick={copyForWechat} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: wechatCopied ? '#d1fae5' : '#e6f7e6' }}>
                {wechatCopied ? <Check className="size-4 text-green-600" /> : <span className="text-lg">💬</span>}
              </div>
              <span className="text-[10px]" style={{ color: '#a8b8ac' }}>{wechatCopied ? '已复制，请在微信中粘贴分享' : '微信'}</span>
            </button>
            <button onClick={shareTwitter} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: '#e8f4fd' }}>
                <span className="text-lg">𝕏</span>
              </div>
              <span className="text-[10px]" style={{ color: '#a8b8ac' }}>Twitter</span>
            </button>
            <button onClick={shareLinkedIn} className="flex flex-col items-center gap-1.5">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ background: '#e8f0fa' }}>
                <span className="text-lg">in</span>
              </div>
              <span className="text-[10px]" style={{ color: '#a8b8ac' }}>LinkedIn</span>
            </button>
          </div>
        </div>
      )}

      {/* Article */}
      <article className="px-5 lg:px-0 lg:max-w-2xl lg:mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <span className="text-xs" style={{ color: '#6a7a7e' }}>
            {post.reading_time_zh} min · {new Date(post.published_at).toLocaleDateString('zh-CN')}
          </span>
        </div>

        <h1 className="text-xl font-bold leading-tight mb-3" style={{ color: '#e8e4dc' }}>
          {post.title_zh || post.title_en}
        </h1>

        <div className="flex items-center gap-2 mb-6">
          <div className="size-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#c9a96e' }}>
            {(post.author || 'K')[0]}
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>{post.author}</span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content - simple markdown rendering */}
        <div
          className="prose prose-sm max-w-none"
          style={{ color: '#e8e4dc', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Bottom share bar */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#a8b8ac' }}>觉得有帮助？分享给朋友</p>
          <div className="flex gap-2">
            <button onClick={copyLink} className="px-4 py-2 text-xs rounded-full flex items-center gap-1.5" style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}>
              <Copy className="size-3" /> {copied ? '已复制' : '复制链接'}
            </button>
            <button onClick={shareTwitter} className="px-4 py-2 text-xs rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}>
              𝕏 Twitter
            </button>
            <button onClick={shareLinkedIn} className="px-4 py-2 text-xs rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}>
              LinkedIn
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'rgba(201,169,110,0.1)' }}>
          <p className="text-sm font-medium" style={{ color: '#e8e4dc' }}>想了解更多？让 Koala AI 帮你</p>
          <Link href="/koala/chat" className="mt-2 inline-block text-xs px-4 py-2 rounded-full no-underline font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
            开始对话 →
          </Link>
        </div>
      </article>
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 rounded-lg p-3 overflow-x-auto my-3"><code class="text-sm" style="color:#a8b8ac">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="text-sm px-1.5 py-0.5 rounded" style="background:rgba(201,169,110,0.1);color:#c9a96e">$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline" style="color:#c9a96e">$1</a>')
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
