'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import { Clock, Eye, Copy, MoreHorizontal } from 'lucide-react';

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

marked.setOptions({ breaks: true, gfm: true });

export default function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<(BlogPost & { cover_image_url?: string | null })[]>([]);
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
        <p style={{ color: '#6a7a7e', fontSize: 14 }}>加载中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ background: '#080c10', minHeight: '100vh' }} className="flex flex-col items-center justify-center gap-3">
        <p style={{ color: '#6a7a7e', fontSize: 14 }}>文章不存在</p>
        <Link href="/koala/blog" style={{ color: '#c9a96e', fontSize: 14 }}>← 返回博客</Link>
      </div>
    );
  }

  const hasBilingual = !!(post.content_zh && post.content_en);

  return (
    <div style={{ background: '#080c10', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50" style={{ background: '#c9a96e', color: '#080c10', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
        {/* 1. Back button */}
        <div style={{ paddingTop: 16 }}>
          <Link href="/koala/blog" className="no-underline" style={{ fontSize: 14, color: '#6a7a7e' }}>
            ← 返回博客
          </Link>
        </div>

        {/* 2. Meta info */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <span style={{ fontSize: 12, color: '#6a7a7e' }}>
            {new Date(post.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span style={{ fontSize: 12, color: '#6a7a7e', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={12} /> {post.reading_time_zh} min
          </span>
          {post.view_count !== undefined && post.view_count > 0 && (
            <span style={{ fontSize: 12, color: '#6a7a7e', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={12} /> {post.view_count}
            </span>
          )}
        </div>

        {/* 3. Title */}
        <h1 className="blog-detail-title" style={{ marginTop: 16, fontWeight: 700, color: '#e8e4dc', lineHeight: 1.35 }}>
          {lang === 'zh' ? (post.title_zh || post.title_en) : (post.title_en || post.title_zh)}
        </h1>

        {/* 4. Cover image */}
        {post.cover_image_url && (
          <div className="blog-cover-wrap" style={{ marginTop: 20 }}>
            <img
              src={post.cover_image_url}
              alt={post.title_zh || post.title_en || ''}
              className="blog-cover-img"
              style={{ width: '100%', objectFit: 'cover', borderRadius: 12 }}
            />
          </div>
        )}

        {/* 5. Language switch */}
        {hasBilingual && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(201,169,110,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#a8b8ac' }}>
              {lang === 'zh' ? '此文章提供英文版本' : 'This article is available in Chinese'}
            </span>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              style={{ fontSize: 13, color: '#c9a96e', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              {lang === 'zh' ? '切换英文' : '切换中文'}
            </button>
          </div>
        )}

        {/* 6. Content */}
        <div
          className="blog-content"
          style={{ marginTop: 24 }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* 7. Tags */}
        {post.tags.length > 0 && (
          <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(201,169,110,0.15)', color: '#a8b8ac' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 8. Share bar */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#6a7a7e' }}>分享:</span>
            <ShareBtn onClick={shareFacebook} label="f" title="Facebook" />
            <ShareBtn onClick={shareTwitter} label="𝕏" title="X" />
            <ShareBtn onClick={shareLinkedIn} label="in" title="LinkedIn" />
            <ShareBtn onClick={shareWhatsApp} label="📱" title="WhatsApp" />
            <ShareBtn onClick={shareWechat} label="💬" title="微信" />
            <ShareBtn onClick={shareXiaohongshu} label="📕" title="小红书" />
            <ShareBtn onClick={shareEmail} label="✉" title="邮件" />
            <button onClick={copyLink} title="复制链接" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={14} style={{ color: '#c9a96e' }} />
            </button>
            {canNativeShare && (
              <button onClick={shareNative} title="更多" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoreHorizontal size={14} style={{ color: '#c9a96e' }} />
              </button>
            )}
          </div>
        </div>

        {/* 9. Related posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e8e4dc', marginBottom: 16 }}>相关文章</h3>
            <div className="related-grid">
              {relatedPosts.map(rp => (
                <Link
                  key={rp.id}
                  href={`/koala/blog/${rp.id}`}
                  className="related-card no-underline"
                >
                  <div
                    className="related-cover"
                    style={{
                      height: 140,
                      background: rp.cover_image_url
                        ? `url(${rp.cover_image_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))',
                      borderRadius: '8px 8px 0 0',
                    }}
                  />
                  <div style={{ padding: 12 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(201,169,110,0.08)', color: '#c9a96e' }}>
                      {CATEGORY_LABELS[rp.category] || rp.category}
                    </span>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#e8e4dc', lineHeight: 1.4, marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {rp.title_zh || rp.title_en}
                    </p>
                    <span style={{ fontSize: 11, color: '#6a7a7e', marginTop: 6, display: 'block' }}>
                      {new Date(rp.published_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 10. CTA */}
        <div style={{ marginTop: 40, marginBottom: 120, padding: 20, borderRadius: 12, background: 'rgba(201,169,110,0.06)' }}>
          <Link href="/koala/chat" className="no-underline" style={{ fontSize: 15, fontWeight: 500, color: '#e8e4dc' }}>
            有问题？直接问 Koala →
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .blog-detail-title { font-size: 20px; }
        @media (min-width: 768px) { .blog-detail-title { font-size: 24px; } }
        .blog-cover-img { max-height: 200px; }
        @media (min-width: 768px) { .blog-cover-img { max-height: 400px; } }
        .blog-content h2 { font-size: 18px; font-weight: 600; color: #e8e4dc; margin: 28px 0 12px; }
        .blog-content h3 { font-size: 16px; font-weight: 600; color: #e8e4dc; margin: 24px 0 10px; }
        .blog-content p { font-size: 15px; color: #e8e4dc; line-height: 1.85; margin-bottom: 16px; }
        .blog-content strong { color: #e8e4dc; }
        .blog-content em { color: #a8b8ac; }
        .blog-content ul, .blog-content ol { margin-left: 20px; color: #e8e4dc; }
        .blog-content li { margin-bottom: 8px; }
        .blog-content a { color: #c9a96e; text-decoration: underline; }
        .blog-content img { width: 100%; border-radius: 8px; margin: 16px 0; }
        .blog-content code { background: rgba(201,169,110,0.08); color: #c9a96e; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .blog-content pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
        .blog-content pre code { background: none; color: #a8b8ac; padding: 0; }
        .blog-content blockquote { border-left: 3px solid #c9a96e; padding-left: 16px; color: #a8b8ac; margin: 16px 0; }
        .blog-content hr { border: none; border-top: 1px solid rgba(201,169,110,0.1); margin: 24px 0; }
        .related-grid { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .related-card { flex-shrink: 0; width: 260px; border-radius: 8px; overflow: hidden; background: linear-gradient(180deg, #111c28, #0d1520); border: 1px solid rgba(201,169,110,0.08); transition: border-color 0.2s; }
        .related-card:hover { border-color: rgba(201,169,110,0.2); }
        @media (min-width: 768px) {
          .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; overflow: visible; }
          .related-card { width: auto; }
        }
      ` }} />
    </div>
  );
}

function ShareBtn({ onClick, label, title }: { onClick: () => void; label: string; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '1px solid rgba(201,169,110,0.15)',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: '#c9a96e',
      }}
    >
      {label}
    </button>
  );
}
