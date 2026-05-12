'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import { Clock, Eye, Mail, Copy, Share2 } from 'lucide-react';
import { shareToWechat, shareToMoments } from '../../../lib/share';

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
    const msg = shareToWechat(wechatText);
    showToast(msg);
  }

  function shareMoments() {
    const momentsText = `${shareTitle}\n\n${shareExcerpt}\n\n🔗 ${shareUrl}\n\n#KoalaPhD #澳洲留学 #PhD申请`;
    const msg = shareToMoments(momentsText);
    showToast(msg);
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
      <div className="bg-white dark:bg-[#080c10] min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">加载中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white dark:bg-[#080c10] min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">文章不存在</p>
        <Link href="/koala/blog" className="text-sm text-[#D4A843]">← 返回博客</Link>
      </div>
    );
  }

  const hasBilingual = !!(post.content_zh && post.content_en);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title_zh || post.title_en,
    description: post.excerpt_zh || post.excerpt_en,
    image: post.cover_image_url,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: 'Koala PhD', url: 'https://koalaphd.com' },
    publisher: { '@type': 'Organization', name: 'Koala PhD', logo: { '@type': 'ImageObject', url: 'https://koalaphd.com/og-image.svg' } },
  };

  return (
    <div className="bg-white dark:bg-[#080c10] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium bg-[#D4A843] text-[#080c10]">
          {toast}
        </div>
      )}

      <div className="max-w-[720px] mx-auto px-5">
        {/* 1. Back button */}
        <div className="pt-4">
          <Link href="/koala/blog" className="no-underline text-sm text-gray-500 dark:text-[#6a7a7e]">
            ← 返回博客
          </Link>
        </div>

        {/* 2. Meta info */}
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-[#D4A843]/[0.06] text-[#D4A843]">
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">
            {new Date(post.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-xs text-gray-500 dark:text-[#6a7a7e] flex items-center gap-1">
            <Clock size={12} /> {post.reading_time_zh} min
          </span>
          {post.view_count !== undefined && post.view_count > 0 && (
            <span className="text-xs text-gray-500 dark:text-[#6a7a7e] flex items-center gap-1">
              <Eye size={12} /> {post.view_count}
            </span>
          )}
        </div>

        {/* 3. Title */}
        <h1 className="blog-detail-title mt-4 font-bold text-gray-900 dark:text-[#e8e4dc] leading-[1.35]">
          {lang === 'zh' ? (post.title_zh || post.title_en) : (post.title_en || post.title_zh)}
        </h1>

        {/* 4. Cover image */}
        {post.cover_image_url && (
          <div className="blog-cover-wrap mt-5">
            <img
              src={post.cover_image_url}
              alt={post.title_zh || post.title_en || ''}
              className="blog-cover-img w-full object-cover rounded-xl"
            />
          </div>
        )}

        {/* 5. Language switch */}
        {hasBilingual && (
          <div className="mt-4 px-4 py-3 rounded-lg flex items-center justify-between bg-gray-50 dark:bg-[#D4A843]/[0.06]">
            <span className="text-sm text-gray-500 dark:text-[#a8b8ac]">
              {lang === 'zh' ? '此文章提供英文版本' : 'This article is available in Chinese'}
            </span>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-sm text-[#D4A843] cursor-pointer bg-transparent border-none"
            >
              {lang === 'zh' ? '切换英文' : '切换中文'}
            </button>
          </div>
        )}

        {/* 6. Content */}
        <div
          className="blog-content mt-6"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* 7. Tags */}
        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-[#D4A843]/15 text-gray-500 dark:text-[#a8b8ac]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 8. Share bar */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#D4A843]/10">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-[#6a7a7e]">分享:</span>
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
            <ShareBtn onClick={shareMoments} title="朋友圈">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2"/></svg>
            </ShareBtn>
            <ShareBtn onClick={shareXiaohongshu} title="小红书">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 18H7V4h11v16zM8 6h8v2H8V6zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>
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

        {/* 9. CTA */}
        <div className="mt-8 rounded-xl px-6 py-8 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-[#1a2a20] dark:to-[#0d1a14] border border-green-200 dark:border-[#D4A843]/20">
          <div className="text-3xl mb-3">🐨</div>
          <h3 className="text-base font-semibold mb-1 text-[#D4A843]">找到适合你的澳洲博导</h3>
          <p className="text-xs mb-4 text-gray-500 dark:text-[#6a7a7e]">AI 智能匹配 4,200+ 位教授，免费开始</p>
          <Link
            href="/koala/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm no-underline bg-[#D4A843] text-[#080c10]"
          >
            开始匹配 →
          </Link>
        </div>

        {/* 10. Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-[#e8e4dc]">相关文章</h3>
            <div className="related-grid">
              {relatedPosts.map(rp => (
                <Link
                  key={rp.id}
                  href={`/koala/blog/${(rp as BlogPost & { slug?: string }).slug || rp.id}`}
                  className="related-card no-underline"
                >
                  <div
                    className={`related-cover rounded-t-lg ${!rp.cover_image_url ? 'bg-gradient-to-br from-[#D4A843]/12 to-[#D4A843]/4' : ''}`}
                    style={{ height: 140, ...(rp.cover_image_url ? { background: `url(${rp.cover_image_url}) center/cover` } : {}) }}
                  />
                  <div className="p-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#D4A843]/[0.08] text-[#D4A843]">
                      {CATEGORY_LABELS[rp.category] || rp.category}
                    </span>
                    <p className="text-sm font-medium leading-snug mt-2 line-clamp-2 text-gray-900 dark:text-[#e8e4dc]">
                      {rp.title_zh || rp.title_en}
                    </p>
                    <span className="text-[11px] mt-1.5 block text-gray-500 dark:text-[#6a7a7e]">
                      {new Date(rp.published_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-[120px]" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .blog-detail-title { font-size: 20px; }
        @media (min-width: 768px) { .blog-detail-title { font-size: 24px; } }
        .blog-cover-img { max-height: 200px; }
        @media (min-width: 768px) { .blog-cover-img { max-height: 400px; } }
        .blog-content h2 { font-size: 18px; font-weight: 600; margin: 28px 0 12px; }
        .blog-content h3 { font-size: 16px; font-weight: 600; margin: 24px 0 10px; }
        .blog-content p { font-size: 15px; line-height: 1.85; margin-bottom: 16px; }
        .blog-content ul, .blog-content ol { margin-left: 20px; }
        .blog-content li { margin-bottom: 8px; }
        .blog-content a { color: #D4A843; text-decoration: underline; }
        .blog-content img { width: 100%; border-radius: 8px; margin: 16px 0; }
        .blog-content code { background: rgba(212,168,67,0.08); color: #D4A843; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .blog-content pre { border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
        .blog-content pre code { background: none; padding: 0; }
        .blog-content blockquote { border-left: 3px solid #D4A843; padding-left: 16px; margin: 16px 0; }
        .blog-content hr { border: none; border-top: 1px solid rgba(212,168,67,0.1); margin: 24px 0; }
        /* Light mode blog content */
        .blog-content h2, .blog-content h3, .blog-content p, .blog-content strong { color: #111827; }
        .blog-content em, .blog-content ul, .blog-content ol { color: #374151; }
        .blog-content pre { background: #f3f4f6; }
        .blog-content pre code { color: #374151; }
        .blog-content blockquote { color: #6b7280; }
        /* Dark mode blog content */
        @media (prefers-color-scheme: dark) {
          .blog-content h2, .blog-content h3, .blog-content p, .blog-content strong { color: #e8e4dc; }
          .blog-content em, .blog-content ul, .blog-content ol { color: #e8e4dc; }
          .blog-content pre { background: rgba(0,0,0,0.3); }
          .blog-content pre code { color: #a8b8ac; }
          .blog-content blockquote { color: #a8b8ac; }
        }
        :is(.dark) .blog-content h2, :is(.dark) .blog-content h3, :is(.dark) .blog-content p, :is(.dark) .blog-content strong { color: #e8e4dc; }
        :is(.dark) .blog-content em, :is(.dark) .blog-content ul, :is(.dark) .blog-content ol { color: #e8e4dc; }
        :is(.dark) .blog-content pre { background: rgba(0,0,0,0.3); }
        :is(.dark) .blog-content pre code { color: #a8b8ac; }
        :is(.dark) .blog-content blockquote { color: #a8b8ac; }
        .share-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(212,168,67,0.15); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: color 0.2s; }
        .share-btn:hover { color: #D4A843; }
        :is(.dark) .share-btn { color: #a8b8ac; }
        .related-grid { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .related-card { flex-shrink: 0; width: 260px; border-radius: 8px; overflow: hidden; background: #ffffff; border: 1px solid #e5e7eb; transition: border-color 0.2s; }
        .related-card:hover { border-color: rgba(212,168,67,0.3); }
        :is(.dark) .related-card { background: linear-gradient(180deg, #111c28, #0d1520); border-color: rgba(212,168,67,0.08); }
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
