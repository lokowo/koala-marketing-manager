'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Copy, Check, MoreHorizontal, Clock } from 'lucide-react';

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
  const [toast, setToast] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch(`/api/blog/${id}`)
      .then(r => r.json())
      .then(data => {
        setPost(data.post || null);
        setLoading(false);
        if (data.post?.category) {
          fetch(`/api/blog?public=true&category=${data.post.category}&limit=4`)
            .then(r => r.json())
            .then(rel => {
              const filtered = (rel.posts || []).filter((p: BlogPost) => p.id !== id);
              setRelatedPosts(filtered.slice(0, 3));
            });
        }
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function getShareUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  function getTitle() {
    return post?.title_zh || post?.title_en || '';
  }

  function copyLink() {
    navigator.clipboard.writeText(getShareUrl());
    showToast('链接已复制');
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank');
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getTitle())}&url=${encodeURIComponent(getShareUrl())}`, '_blank');
  }

  function shareLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`, '_blank');
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(getTitle() + ' ' + getShareUrl())}`, '_blank');
  }

  function shareWechat() {
    navigator.clipboard.writeText(getShareUrl());
    showToast('链接已复制，请在微信中粘贴分享');
  }

  function shareXiaohongshu() {
    navigator.clipboard.writeText(`${getTitle()}\n${getShareUrl()}`);
    showToast('已复制，请在小红书中粘贴');
  }

  function shareEmail() {
    window.open(`mailto:?subject=${encodeURIComponent(getTitle())}&body=${encodeURIComponent(getTitle() + '\n\n' + getShareUrl())}`, '_self');
  }

  async function shareNative() {
    try {
      await navigator.share({ title: getTitle(), url: getShareUrl() });
    } catch { /* user cancelled */ }
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex px-4 pt-4 pb-2 items-center sticky top-0 z-10" style={{ background: '#080c10' }}>
        <Link href="/koala/blog" className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.06)' }}>
          <ChevronLeft className="size-5" style={{ color: '#e8e4dc' }} />
        </Link>
      </div>

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

        {/* Content */}
        <div
          className="prose prose-sm max-w-none"
          style={{ color: '#e8e4dc', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Share Bar */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#a8b8ac' }}>分享文章</p>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareBtn onClick={shareFacebook} label="f" title="Facebook" />
            <ShareBtn onClick={shareTwitter} label="𝕏" title="X" />
            <ShareBtn onClick={shareLinkedIn} label="in" title="LinkedIn" />
            <ShareBtn onClick={shareWhatsApp} label="📱" title="WhatsApp" />
            <ShareBtn onClick={shareWechat} label="💬" title="微信" />
            <ShareBtn onClick={shareXiaohongshu} label="📕" title="小红书" />
            <ShareBtn onClick={shareEmail} label="✉" title="邮件" />
            <button onClick={copyLink} title="复制链接" className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.06)' }}>
              <Copy className="size-3.5" style={{ color: '#c9a96e' }} />
            </button>
            {canNativeShare && (
              <button onClick={shareNative} title="更多" className="size-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.06)' }}>
                <MoreHorizontal className="size-3.5" style={{ color: '#c9a96e' }} />
              </button>
            )}
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#a8b8ac' }}>相关文章</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {relatedPosts.map(rp => (
                <Link
                  key={rp.id}
                  href={`/koala/blog/${rp.id}`}
                  className="flex-shrink-0 w-56 p-3 rounded-xl no-underline"
                  style={{ background: 'rgba(201,169,110,0.06)' }}
                >
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mb-2" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}>
                    {CATEGORY_LABELS[rp.category] || rp.category}
                  </span>
                  <p className="text-sm font-medium line-clamp-2 leading-snug mb-1.5" style={{ color: '#e8e4dc' }}>
                    {rp.title_zh || rp.title_en}
                  </p>
                  <span className="text-[11px] flex items-center gap-1" style={{ color: '#6a7a7e' }}>
                    <Clock className="size-3" /> {rp.reading_time_zh} min
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

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

function ShareBtn({ onClick, label, title }: { onClick: () => void; label: string; title: string }) {
  return (
    <button onClick={onClick} title={title} className="size-9 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
      {label}
    </button>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 rounded-lg p-3 overflow-x-auto my-3"><code class="text-sm" style="color:#a8b8ac">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="text-sm px-1.5 py-0.5 rounded" style="background:rgba(201,169,110,0.1);color:#c9a96e">$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline" style="color:#c9a96e">$1</a>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-5 mb-2" style="color:#e8e4dc">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-6 mb-3" style="color:#e8e4dc">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3" style="color:#e8e4dc">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8e4dc">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc" style="color:#c8d0cc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal" style="color:#c8d0cc">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(?!<)(.+)$/gm, '<p class="mb-3">$1</p>');
}
