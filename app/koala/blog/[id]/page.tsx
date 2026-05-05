'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import { Clock, Eye, Mail, Copy, Share2 } from 'lucide-react';

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com';
  const shareUrl = post ? `${baseUrl}/koala/blog/${post.id}` : '';
  const shareTitle = post?.title_zh || post?.title_en || '';
  const shareExcerpt = post?.excerpt_zh || post?.excerpt_en || '';

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    showToast('链接已复制');
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  }

  function shareLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + '\n' + shareUrl)}`, '_blank');
  }

  function shareWechat() {
    const wechatText = `【Koala PhD】${shareTitle}\n\n${shareExcerpt}\n\n阅读全文👉 ${shareUrl}`;
    navigator.clipboard.writeText(wechatText);
    showToast('已复制分享内容，请在微信中粘贴发送');
  }

  function shareXiaohongshu() {
    const excerpt = post?.excerpt_zh || (post?.content_zh || '').slice(0, 100);
    const xhsText = `${shareTitle} #KoalaPhD #澳洲留学 #PhD申请\n\n${excerpt}...\n\n🔗 ${shareUrl}`;
    navigator.clipboard.writeText(xhsText);
    showToast('已复制小红书文案，请在小红书中粘贴发布');
  }

  function shareEmail() {
    window.open(`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareExcerpt + '\n\n' + shareUrl)}`, '_self');
  }

  async function shareNative() {
    try {
      await navigator.share({ title: shareTitle, text: shareExcerpt, url: shareUrl });
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
            <ShareBtn onClick={shareFacebook} title="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareTwitter} title="X">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareLinkedIn} title="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareWhatsApp} title="WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareWechat} title="微信">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.2 4.127c-4.34 0-7.963 2.876-7.963 6.545 0 3.67 3.623 6.546 7.963 6.546.856 0 1.693-.115 2.478-.344a.8.8 0 01.584.088l1.576.922a.257.257 0 00.135.044c.13 0 .236-.107.236-.24 0-.06-.023-.118-.04-.176l-.32-1.225a.478.478 0 01.174-.54c1.563-1.157 2.55-2.873 2.55-4.775 0-3.67-3.542-6.845-7.573-6.845zm-2.773 3.368c.533 0 .964.438.964.978a.971.971 0 01-.964.978.971.971 0 01-.964-.978c0-.54.43-.978.964-.978zm5.547 0c.533 0 .964.438.964.978a.971.971 0 01-.964.978.971.971 0 01-.964-.978c0-.54.43-.978.964-.978z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareXiaohongshu} title="小红书">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.56 13.295c-.05.463-.204.862-.462 1.197-.258.335-.59.588-.997.76-.406.17-.86.257-1.36.257-.318 0-.618-.035-.9-.105a3.49 3.49 0 01-.762-.287l-.492.72h-1.17l.678-1.002a3.01 3.01 0 01-.585-.735 2.52 2.52 0 01-.276-1.17V9.84h1.35v3.09c0 .27.042.51.126.72.084.21.204.39.36.54.156.15.336.264.54.342.204.078.426.117.666.117.234 0 .456-.042.666-.126a1.59 1.59 0 00.54-.354c.156-.153.276-.336.36-.549.084-.213.126-.45.126-.711V9.84h1.35v3.09c0 .138-.01.262-.028.372z"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareEmail} title="邮件">
              <Mail size={18} />
            </ShareBtn>
            <ShareBtn onClick={copyLink} title="复制链接">
              <Copy size={18} />
            </ShareBtn>
            {canNativeShare && (
              <ShareBtn onClick={shareNative} title="更多分享">
                <Share2 size={18} />
              </ShareBtn>
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
        .share-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(201,169,110,0.15); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #a8b8ac; transition: color 0.2s; }
        .share-btn:hover { color: #c9a96e; }
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

function ShareBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="share-btn"
    >
      {children}
    </button>
  );
}
