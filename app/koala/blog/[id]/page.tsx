'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import { ChevronLeft, Copy, MoreHorizontal, Clock, Eye } from 'lucide-react';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  excerpt_zh: string | null;
  excerpt_en: string | null;
  content_zh: string | null;
  content_en: string | null;
  category: string;
  author: string;
  reading_time_zh: number;
  published_at: string;
  cover_image_url: string | null;
  tags: string[];
  view_count?: number;
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

marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

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

  const renderedContent = useMemo(() => {
    if (!post) return '';
    const content = lang === 'zh'
      ? (post.content_zh || post.content_en || '')
      : (post.content_en || post.content_zh || '');
    return marked.parse(content) as string;
  }, [post, lang]);

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

  const hasBilingual = !!(post.content_zh && post.content_en);

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 120 }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex px-4 pt-4 pb-2 items-center sticky top-0 z-10 max-w-[720px] mx-auto" style={{ background: '#080c10' }}>
        <Link href="/koala/blog" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: '#a8b8ac' }}>
          <ChevronLeft className="size-4" />
          返回博客
        </Link>
      </div>

      <article className="px-5 md:px-0 max-w-[720px] mx-auto">
        {/* Meta info */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}>
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <span className="text-xs" style={{ color: '#6a7a7e' }}>
            {new Date(post.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-xs flex items-center gap-0.5" style={{ color: '#6a7a7e' }}>
            <Clock className="size-3" /> {post.reading_time_zh} min
          </span>
          {post.view_count !== undefined && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: '#6a7a7e' }}>
              <Eye className="size-3" /> {post.view_count}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold leading-tight mb-4" style={{ color: '#e8e4dc' }}>
          {lang === 'zh' ? (post.title_zh || post.title_en) : (post.title_en || post.title_zh)}
        </h1>

        {/* Cover Image */}
        {post.cover_image_url && (
          <div className="mb-6 -mx-5 md:mx-0">
            <img
              src={post.cover_image_url}
              alt={post.title_zh || post.title_en || ''}
              className="w-full object-cover blog-cover-img"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}

        {/* Language Switch */}
        {hasBilingual && (
          <div className="flex items-center gap-3 mb-6 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <span className="text-xs" style={{ color: '#a8b8ac' }}>
              {lang === 'zh' ? '此文章提供英文版本' : 'This article is available in Chinese'}
            </span>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: '#c9a96e', color: '#080c10' }}
            >
              {lang === 'zh' ? '切换英文' : '切换中文'}
            </button>
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#c9a96e' }}>
            {(post.author || 'K')[0]}
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: '#e8e4dc' }}>{post.author}</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-8 pt-6" style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}>
            {post.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

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
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:grid md:grid-cols-3 md:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {relatedPosts.map(rp => (
                <Link
                  key={rp.id}
                  href={`/koala/blog/${rp.id}`}
                  className="related-card flex-shrink-0 w-56 md:w-auto p-3 rounded-xl no-underline transition-all"
                  style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid transparent' }}
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
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <p className="text-sm font-medium" style={{ color: '#e8e4dc' }}>有问题？直接问 Koala</p>
          <p className="text-xs mt-1 mb-3" style={{ color: '#6a7a7e' }}>AI 学术顾问随时为你解答 PhD 申请问题</p>
          <Link href="/koala/chat" className="inline-block text-xs px-4 py-2 rounded-full no-underline font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
            开始对话 →
          </Link>
        </div>
      </article>

      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content { color: #e8e4dc; line-height: 1.85; font-size: 15px; }
        .blog-content h1 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: #e8e4dc; }
        .blog-content h2 { font-size: 1.25rem; font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.6rem; color: #e8e4dc; }
        .blog-content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #e8e4dc; }
        .blog-content p { margin-bottom: 1rem; color: #c8d0cc; }
        .blog-content a { color: #c9a96e; text-decoration: underline; }
        .blog-content strong { color: #e8e4dc; font-weight: 600; }
        .blog-content ul, .blog-content ol { margin: 0.75rem 0; padding-left: 1.5rem; }
        .blog-content li { margin-bottom: 0.4rem; color: #c8d0cc; }
        .blog-content blockquote { border-left: 3px solid #c9a96e; padding-left: 1rem; margin: 1rem 0; color: #a8b8ac; font-style: italic; }
        .blog-content code { background: rgba(201,169,110,0.1); color: #c9a96e; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.875em; }
        .blog-content pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
        .blog-content pre code { background: none; color: #a8b8ac; padding: 0; }
        .blog-content img { width: 100%; border-radius: 12px; margin: 1.5rem 0; }
        .blog-content hr { border: none; border-top: 1px solid rgba(201,169,110,0.1); margin: 2rem 0; }
        .related-card:hover { border-color: rgba(201,169,110,0.2) !important; }
        @media (min-width: 768px) { .blog-cover-img { max-height: 400px !important; border-radius: 12px !important; } }
      ` }} />
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
