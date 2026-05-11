'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { marked } from 'marked';

const CATEGORIES: Record<string, string> = {
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

interface InlineImage {
  alt: string;
  url: string;
  fullMatch: string;
  index: number;
}

function extractInlineImages(content: string): InlineImage[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: InlineImage[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2], fullMatch: match[0], index: match.index });
  }
  return images;
}

marked.setOptions({ breaks: true, gfm: true });

// ─── AI Illustration Types ──────────────────────────────────────────────────

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  keyword: string;
  selected: boolean;
}

interface InsertionPoint {
  label: string;
  heading: string;
  position: number;
}

function getInsertionPoints(content: string): InsertionPoint[] {
  const lines = content.split('\n');
  const points: InsertionPoint[] = [{ label: '文章开头', heading: '__start__', position: 0 }];
  let pos = 0;
  for (const line of lines) {
    pos += line.length + 1;
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      points.push({ label: `「${m[1].trim()}」之后`, heading: m[1].trim(), position: pos });
    }
  }
  points.push({ label: '文章末尾', heading: '__end__', position: content.length });
  return points;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BlogEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">加载中...</div>}>
      <BlogEditPageInner />
    </Suspense>
  );
}

function BlogEditPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [aiWorking, setAiWorking] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<'zh' | 'en'>('zh');
  const [editorMode, setEditorMode] = useState<'edit' | 'visual' | 'preview'>(() =>
    searchParams.get('mode') === 'preview' ? 'preview' : 'edit'
  );
  const [imageCount, setImageCount] = useState(1);
  const [form, setForm] = useState({
    category: 'phd_guide',
    tags: '',
    cover_image_url: '',
    title_zh: '',
    title_en: '',
    excerpt_zh: '',
    excerpt_en: '',
    content_zh: '',
    content_en: '',
    status: 'draft' as string,
    scheduled_at: '',
  });

  // AI illustration state
  const [showIllustrationPanel, setShowIllustrationPanel] = useState(false);
  const [generatingIllustrations, setGeneratingIllustrations] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedInsertPoint, setSelectedInsertPoint] = useState<string>('');
  const [insertingImage, setInsertingImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editId) {
      fetch(`/api/blog/${editId}`)
        .then(r => r.json())
        .then(data => {
          const post = data.post;
          if (post) {
            setForm({
              category: post.category || 'phd_guide',
              tags: (post.tags || []).join(', '),
              cover_image_url: post.cover_image_url || '',
              title_zh: post.title_zh || '',
              title_en: post.title_en || '',
              excerpt_zh: post.excerpt_zh || '',
              excerpt_en: post.excerpt_en || '',
              content_zh: post.content_zh || '',
              content_en: post.content_en || '',
              status: post.status || 'draft',
              scheduled_at: post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '',
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [editId]);

  const inlineImages = useMemo(() => extractInlineImages(form.content_zh), [form.content_zh]);
  const insertionPoints = useMemo(() => getInsertionPoints(form.content_zh), [form.content_zh]);

  const renderedContent = useMemo(() => {
    const content = contentTab === 'zh'
      ? (form.content_zh || form.content_en || '')
      : (form.content_en || form.content_zh || '');
    return marked.parse(content) as string;
  }, [form.content_zh, form.content_en, contentTab]);

  async function aiAssist(action: string) {
    setAiWorking(action);
    try {
      const res = await fetch('/api/blog/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: form.title_zh || form.title_en,
          content: form.content_zh || form.content_en,
          category: form.category,
        }),
      });
      const data = await res.json();

      if (action === 'recommend_category' && data.category) {
        setForm(prev => ({ ...prev, category: data.category }));
      } else if (action === 'generate_tags' && data.tags) {
        setForm(prev => ({ ...prev, tags: data.tags.join(', ') }));
      } else if (action === 'translate') {
        setForm(prev => ({
          ...prev,
          title_en: data.titleEn || prev.title_en,
          excerpt_en: data.excerptEn || prev.excerpt_en,
          content_en: data.contentEn || prev.content_en,
        }));
        setContentTab('en');
      } else if (action === 'cover_prompt') {
        setForm(prev => ({ ...prev, cover_image_url: `[AI Prompt] ${data.prompt}` }));
      }
    } catch {
      alert('AI 操作失败，请重试');
    }
    setAiWorking(null);
  }

  async function generateCover() {
    if (!editId || aiWorking === 'cover_image') return;
    setAiWorking('cover_image');
    try {
      const res = await fetch('/api/blog/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: editId }),
      });
      const data = await res.json();
      const url = data.imageUrl || data.coverUrl;
      if (url) {
        setForm(prev => ({ ...prev, cover_image_url: url }));
      } else {
        alert(data.error || 'AI封面生成失败');
      }
    } catch { alert('AI封面生成失败'); }
    setAiWorking(null);
  }

  function removeInlineImage(img: InlineImage) {
    setForm(prev => ({
      ...prev,
      content_zh: prev.content_zh.replace(img.fullMatch, '').replace(/\n{3,}/g, '\n\n'),
    }));
  }

  function moveImageUp(img: InlineImage) {
    const content = form.content_zh;
    const before = content.slice(0, img.index);
    const after = content.slice(img.index + img.fullMatch.length);
    const prevHeading = before.lastIndexOf('\n## ');
    if (prevHeading === -1) return;
    const insertAt = before.lastIndexOf('\n', prevHeading - 1);
    if (insertAt === -1) return;
    const cleaned = (before + after).replace(/\n{3,}/g, '\n\n');
    const headingBefore = cleaned.lastIndexOf('\n## ', insertAt);
    const actualInsert = headingBefore !== -1
      ? cleaned.indexOf('\n', headingBefore + 1) + 1
      : 0;
    const newContent = cleaned.slice(0, actualInsert) + '\n' + img.fullMatch + '\n' + cleaned.slice(actualInsert);
    setForm(prev => ({ ...prev, content_zh: newContent.replace(/\n{3,}/g, '\n\n') }));
  }

  function moveImageDown(img: InlineImage) {
    const content = form.content_zh;
    const afterImg = content.slice(img.index + img.fullMatch.length);
    const nextHeading = afterImg.indexOf('\n## ');
    if (nextHeading === -1) return;
    const headingEnd = afterImg.indexOf('\n', nextHeading + 4);
    if (headingEnd === -1) return;
    const cleaned = content.slice(0, img.index) + afterImg;
    const cleanAfterImg = cleaned.slice(img.index);
    const nextH = cleanAfterImg.indexOf('\n## ');
    if (nextH === -1) return;
    const hEnd = cleanAfterImg.indexOf('\n', nextH + 4);
    const insertPos = img.index + (hEnd !== -1 ? hEnd + 1 : nextH + 4);
    const newContent = cleaned.slice(0, insertPos) + '\n' + img.fullMatch + '\n' + cleaned.slice(insertPos);
    setForm(prev => ({ ...prev, content_zh: newContent.replace(/\n{3,}/g, '\n\n') }));
  }

  async function generateInlineImages() {
    if (!editId || aiWorking === 'add_inline' || imageCount < 1) return;
    setAiWorking('add_inline');
    try {
      // Step 1: Get prompts
      const promptRes = await fetch('/api/blog/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: editId, imageCount }),
      });
      const { prompts } = await promptRes.json();
      if (!prompts?.length) { alert('未能生成图片建议'); setAiWorking(null); return; }

      // Step 2: Generate images one by one, then insert
      const generatedImages: { url: string; position: string }[] = [];
      for (let i = 0; i < prompts.length; i++) {
        const imgRes = await fetch('/api/blog/generate-single-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: editId, promptEn: prompts[i].promptEn, index: i }),
        });
        const imgData = await imgRes.json();
        if (imgData.imageUrl) {
          generatedImages.push({ url: imgData.imageUrl, position: `after:${prompts[i].suggestedHeading}` });
        }
      }

      // Step 3: Insert all images
      if (generatedImages.length > 0) {
        const insertRes = await fetch('/api/blog/insert-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: editId, images: generatedImages }),
        });
        const insertData = await insertRes.json();
        if (insertData.updatedContent) {
          setForm(prev => ({ ...prev, content_zh: insertData.updatedContent }));
        }
      } else {
        alert('插图生成失败');
      }
    } catch { alert('插图生成失败'); }
    setAiWorking(null);
  }

  // AI Illustration: generate multiple candidate images for user selection
  const generateIllustrationCandidates = useCallback(async () => {
    if (!form.content_zh && !form.title_zh) return;
    setGeneratingIllustrations(true);
    setGeneratedImages([]);
    try {
      const res = await fetch('/api/blog/generate-illustration-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title_zh || form.title_en,
          content: form.content_zh.slice(0, 3000),
          count: 4,
        }),
      });
      const data = await res.json();
      if (data.images?.length) {
        setGeneratedImages(data.images.map((img: { url: string; prompt: string; keyword: string }, i: number) => ({
          id: `gen-${i}-${Date.now()}`,
          url: img.url,
          prompt: img.prompt,
          keyword: img.keyword,
          selected: false,
        })));
      } else {
        alert(data.error || '插图生成失败');
      }
    } catch { alert('插图生成失败'); }
    setGeneratingIllustrations(false);
  }, [form.content_zh, form.title_zh, form.title_en]);

  function toggleImageSelection(id: string) {
    setGeneratedImages(prev => prev.map(img =>
      img.id === id ? { ...img, selected: !img.selected } : img
    ));
  }

  function insertSelectedImages() {
    const selected = generatedImages.filter(img => img.selected);
    if (selected.length === 0) return;

    let content = form.content_zh;
    for (const img of selected) {
      const point = insertionPoints.find(p => p.heading === selectedInsertPoint);
      if (!point) {
        content += `\n\n![${img.keyword}](${img.url})\n`;
      } else if (point.heading === '__start__') {
        content = `![${img.keyword}](${img.url})\n\n` + content;
      } else if (point.heading === '__end__') {
        content += `\n\n![${img.keyword}](${img.url})\n`;
      } else {
        const headingPattern = new RegExp(
          `(##\\s*${point.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
          'i'
        );
        const match = content.match(headingPattern);
        if (match && match.index !== undefined) {
          const insertPos = match.index + match[0].length;
          content = content.slice(0, insertPos) + `\n\n![${img.keyword}](${img.url})\n` + content.slice(insertPos);
        } else {
          content += `\n\n![${img.keyword}](${img.url})\n`;
        }
      }
    }
    setForm(prev => ({ ...prev, content_zh: content.replace(/\n{3,}/g, '\n\n') }));
    setGeneratedImages(prev => prev.map(img => ({ ...img, selected: false })));
    setShowIllustrationPanel(false);
  }

  // Insert a single generated image at chosen position
  async function insertSingleImage(img: GeneratedImage, heading: string) {
    setInsertingImage(img.id);
    let content = form.content_zh;
    if (heading === '__start__') {
      content = `![${img.keyword}](${img.url})\n\n` + content;
    } else if (heading === '__end__') {
      content += `\n\n![${img.keyword}](${img.url})\n`;
    } else {
      const headingPattern = new RegExp(
        `(##\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
        'i'
      );
      const match = content.match(headingPattern);
      if (match && match.index !== undefined) {
        const insertPos = match.index + match[0].length;
        content = content.slice(0, insertPos) + `\n\n![${img.keyword}](${img.url})\n` + content.slice(insertPos);
      } else {
        content += `\n\n![${img.keyword}](${img.url})\n`;
      }
    }
    setForm(prev => ({ ...prev, content_zh: content.replace(/\n{3,}/g, '\n\n') }));
    setGeneratedImages(prev => prev.filter(i => i.id !== img.id));
    setInsertingImage(null);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...(editId ? { id: editId } : {}),
      title_zh: form.title_zh,
      title_en: form.title_en,
      excerpt_zh: form.excerpt_zh,
      excerpt_en: form.excerpt_en,
      content_zh: form.content_zh,
      content_en: form.content_en,
      category: form.category,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      cover_image_url: form.cover_image_url?.startsWith('[AI Prompt]') ? null : (form.cover_image_url || null),
      status: form.status,
      scheduled_at: form.status === 'scheduled' && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      published_at: form.status === 'published' ? new Date().toISOString() : undefined,
    };

    const res = await fetch('/api/blog', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push('/dashboard/koala/blog');
    } else {
      alert('保存失败');
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">加载中...</div>;
  }

  const hasCover = form.cover_image_url && !form.cover_image_url.startsWith('[') && form.cover_image_url.startsWith('http');

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{editId ? '编辑文章' : '新建文章'}</h2>
        <div className="flex items-center gap-2">
          {editId && (
            <button
              onClick={() => setEditorMode('preview')}
              className={`px-4 py-2 text-sm rounded-lg transition ${editorMode === 'preview' ? 'bg-green-600 text-white' : 'border border-green-300 text-green-700 hover:bg-green-50'}`}
            >
              👁 预览发布效果
            </button>
          )}
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700">← 返回列表</button>
        </div>
      </div>

      {/* ─── Preview Mode ─── */}
      {editorMode === 'preview' && (
        <div className="relative">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-lg shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-green-700">👁 预览模式</span>
              <span className="text-xs text-slate-400">以下是文章发布后的实际效果</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContentTab(contentTab === 'zh' ? 'en' : 'zh')}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {contentTab === 'zh' ? '切换英文' : '切换中文'}
              </button>
              <button
                onClick={() => setEditorMode('edit')}
                className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-900"
              >
                ← 返回编辑
              </button>
            </div>
          </div>

          {/* Simulated blog post view */}
          <div className="rounded-b-lg overflow-hidden" style={{ background: '#080c10' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
                  {CATEGORIES[form.category] || form.category}
                </span>
                <span style={{ fontSize: 12, color: '#6a7a7e' }}>
                  {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ marginTop: 16, fontSize: 24, fontWeight: 700, color: '#e8e4dc', lineHeight: 1.35 }}>
                {contentTab === 'zh' ? (form.title_zh || form.title_en || '无标题') : (form.title_en || form.title_zh || 'Untitled')}
              </h1>

              {/* Cover */}
              {hasCover && (
                <div style={{ marginTop: 20 }}>
                  <img src={form.cover_image_url} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 12 }} />
                </div>
              )}

              {/* Content */}
              <div
                className="blog-preview-content"
                style={{ marginTop: 24 }}
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />

              {/* Tags */}
              {form.tags && (
                <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(201,169,110,0.15)', color: '#a8b8ac' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div
                className="rounded-xl px-6 py-8 text-center"
                style={{ marginTop: 32, background: 'linear-gradient(135deg, #1a2a20, #0d1a14)', border: '1px solid rgba(201,169,110,0.2)' }}
              >
                <div className="text-3xl mb-3">🐨</div>
                <h3 className="text-base font-semibold mb-1" style={{ color: '#c9a96e' }}>找到适合你的澳洲博导</h3>
                <p className="text-xs mb-4" style={{ color: '#6a7a7e' }}>AI 智能匹配 4,200+ 位教授，免费开始</p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm" style={{ background: '#c9a96e', color: '#080c10' }}>
                  开始匹配 →
                </span>
              </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            .blog-preview-content h2 { font-size: 18px; font-weight: 600; color: #e8e4dc; margin: 28px 0 12px; }
            .blog-preview-content h3 { font-size: 16px; font-weight: 600; color: #e8e4dc; margin: 24px 0 10px; }
            .blog-preview-content p { font-size: 15px; color: #e8e4dc; line-height: 1.85; margin-bottom: 16px; }
            .blog-preview-content strong { color: #e8e4dc; }
            .blog-preview-content em { color: #a8b8ac; }
            .blog-preview-content ul, .blog-preview-content ol { margin-left: 20px; color: #e8e4dc; }
            .blog-preview-content li { margin-bottom: 8px; font-size: 15px; line-height: 1.85; }
            .blog-preview-content a { color: #c9a96e; text-decoration: underline; }
            .blog-preview-content img { width: 100%; border-radius: 8px; margin: 16px 0; }
            .blog-preview-content code { background: rgba(201,169,110,0.08); color: #c9a96e; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
            .blog-preview-content pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
            .blog-preview-content pre code { background: none; color: #a8b8ac; padding: 0; }
            .blog-preview-content blockquote { border-left: 3px solid #c9a96e; padding-left: 16px; color: #a8b8ac; margin: 16px 0; }
            .blog-preview-content hr { border: none; border-top: 1px solid rgba(201,169,110,0.1); margin: 24px 0; }
            .blog-preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .blog-preview-content th, .blog-preview-content td { border: 1px solid rgba(201,169,110,0.15); padding: 8px 12px; font-size: 13px; color: #e8e4dc; }
            .blog-preview-content th { background: rgba(201,169,110,0.06); font-weight: 600; }
          ` }} />
        </div>
      )}

      {/* ─── Editor Mode ─── */}
      {editorMode !== 'preview' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-5">
          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                分类 Category
                <AIButton label="🔖 AI推荐" working={aiWorking === 'recommend_category'} onClick={() => aiAssist('recommend_category')} />
              </label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                标签 Tags
                <AIButton label="🏷 AI生成" working={aiWorking === 'generate_tags'} onClick={() => aiAssist('generate_tags')} />
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="逗号分隔标签"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">封面图 Cover Image</h3>
            {hasCover ? (
              <div>
                <img src={form.cover_image_url} alt="cover preview" className="rounded-lg w-full max-h-48 object-cover" />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={generateCover}
                    disabled={!editId || aiWorking === 'cover_image'}
                    className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                  >
                    {aiWorking === 'cover_image' ? '⏳ 生成中(~15s)...' : '🔄 重新生成'}
                  </button>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, cover_image_url: '' }))}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    🗑 删除封面
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                {aiWorking === 'cover_image' ? (
                  <p className="text-sm text-amber-600 animate-pulse">⏳ 封面图生成中(~15s)...</p>
                ) : editId ? (
                  <button
                    onClick={generateCover}
                    className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    🎨 AI 生成封面图
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">保存文章后可生成封面图</p>
                )}
              </div>
            )}
            <input
              type="text"
              value={form.cover_image_url}
              onChange={e => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
              placeholder="图片URL（或点击上方按钮AI生成）"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-3"
            />
          </div>

          {/* Content editor mode toggle */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Language tabs */}
              <button
                onClick={() => setContentTab('zh')}
                className={`px-3 py-1.5 text-sm rounded-lg ${contentTab === 'zh' ? 'bg-amber-100 text-amber-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                中文内容
              </button>
              <button
                onClick={() => setContentTab('en')}
                className={`px-3 py-1.5 text-sm rounded-lg ${contentTab === 'en' ? 'bg-amber-100 text-amber-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                English Content
              </button>

              <div className="flex-1" />

              {/* Editor mode toggle */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setEditorMode('edit')}
                  className={`px-3 py-1.5 text-xs ${editorMode === 'edit' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  📝 Markdown
                </button>
                <button
                  onClick={() => setEditorMode('visual')}
                  className={`px-3 py-1.5 text-xs ${editorMode === 'visual' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  🖼 可视化
                </button>
              </div>

              <button
                onClick={() => aiAssist('translate')}
                disabled={aiWorking === 'translate' || !form.content_zh}
                className="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
              >
                {aiWorking === 'translate' ? '⏳ 翻译中...' : '🔄 AI翻译到English'}
              </button>
            </div>

            {/* Markdown edit mode */}
            {editorMode === 'edit' && (
              <>
                {contentTab === 'zh' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.title_zh}
                      onChange={e => setForm(prev => ({ ...prev, title_zh: e.target.value }))}
                      placeholder="中文标题"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
                    />
                    <input
                      type="text"
                      value={form.excerpt_zh}
                      onChange={e => setForm(prev => ({ ...prev, excerpt_zh: e.target.value }))}
                      placeholder="中文摘要（100字）"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <textarea
                      ref={textareaRef}
                      value={form.content_zh}
                      onChange={e => setForm(prev => ({ ...prev, content_zh: e.target.value }))}
                      placeholder="中文正文（Markdown格式）"
                      rows={20}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.title_en}
                      onChange={e => setForm(prev => ({ ...prev, title_en: e.target.value }))}
                      placeholder="English Title"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
                    />
                    <input
                      type="text"
                      value={form.excerpt_en}
                      onChange={e => setForm(prev => ({ ...prev, excerpt_en: e.target.value }))}
                      placeholder="English Excerpt"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <textarea
                      value={form.content_en}
                      onChange={e => setForm(prev => ({ ...prev, content_en: e.target.value }))}
                      placeholder="English Content (Markdown)"
                      rows={20}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                )}
              </>
            )}

            {/* Visual edit mode — renders markdown with editable image overlays */}
            {editorMode === 'visual' && (
              <div className="space-y-3">
                {contentTab === 'zh' ? (
                  <>
                    <input
                      type="text"
                      value={form.title_zh}
                      onChange={e => setForm(prev => ({ ...prev, title_zh: e.target.value }))}
                      placeholder="中文标题"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-lg font-bold"
                    />
                    <input
                      type="text"
                      value={form.excerpt_zh}
                      onChange={e => setForm(prev => ({ ...prev, excerpt_zh: e.target.value }))}
                      placeholder="中文摘要"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={form.title_en}
                      onChange={e => setForm(prev => ({ ...prev, title_en: e.target.value }))}
                      placeholder="English Title"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-lg font-bold"
                    />
                    <input
                      type="text"
                      value={form.excerpt_en}
                      onChange={e => setForm(prev => ({ ...prev, excerpt_en: e.target.value }))}
                      placeholder="English Excerpt"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </>
                )}

                <VisualEditor
                  content={contentTab === 'zh' ? form.content_zh : form.content_en}
                  onChange={val => {
                    if (contentTab === 'zh') setForm(prev => ({ ...prev, content_zh: val }));
                    else setForm(prev => ({ ...prev, content_en: val }));
                  }}
                  images={contentTab === 'zh' ? inlineImages : extractInlineImages(form.content_en)}
                  onRemoveImage={removeInlineImage}
                  onMoveUp={moveImageUp}
                  onMoveDown={moveImageDown}
                />
              </div>
            )}
          </div>

          {/* Image Management Panel */}
          {editId && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-700">文内插图 Inline Images ({inlineImages.length})</h3>
                <button
                  onClick={() => setShowIllustrationPanel(!showIllustrationPanel)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${showIllustrationPanel ? 'bg-purple-600 text-white' : 'border border-purple-300 text-purple-700 hover:bg-purple-50'}`}
                >
                  🎨 AI 智能插图
                </button>
              </div>

              {/* Existing images */}
              {inlineImages.length > 0 && (
                <div className="space-y-2 mb-3">
                  {inlineImages.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg group">
                      <img src={img.url} alt={img.alt} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 truncate">{img.alt || '无标题'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{img.url.slice(0, 60)}...</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveImageUp(img)}
                          className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100"
                          title="上移"
                        >
                          ⬆️
                        </button>
                        <button
                          onClick={() => moveImageDown(img)}
                          className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100"
                          title="下移"
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => removeInlineImage(img)}
                          className="text-xs text-red-500 hover:text-red-700 px-1.5 py-1 rounded hover:bg-red-50"
                          title="删除"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick add inline images (legacy) */}
              <div className="flex items-center gap-2">
                <select
                  value={String(imageCount)}
                  onChange={e => setImageCount(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="1">1 张</option>
                  <option value="2">2 张</option>
                  <option value="3">3 张</option>
                </select>
                <button
                  onClick={generateInlineImages}
                  disabled={aiWorking === 'add_inline'}
                  className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                >
                  {aiWorking === 'add_inline' ? '⏳ 生成中(~20s)...' : '⚡ 快速自动插图'}
                </button>
                <span className="text-[10px] text-slate-400">自动选择位置并插入</span>
              </div>

              {/* AI Illustration Panel */}
              {showIllustrationPanel && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-purple-700">🎨 AI 智能插图 — 选择并安排位置</h4>
                    <button
                      onClick={generateIllustrationCandidates}
                      disabled={generatingIllustrations}
                      className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {generatingIllustrations ? '⏳ 生成候选插图中...' : '🔄 生成候选插图（4张）'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    根据文章关键词随机生成插图，你可以选择喜欢的图片并安排在文章中的位置。
                  </p>

                  {generatingIllustrations && (
                    <div className="py-8 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-slate-500">正在根据文章关键词生成 4 张候选插图...</p>
                    </div>
                  )}

                  {generatedImages.length > 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {generatedImages.map(img => (
                          <div
                            key={img.id}
                            className={`relative border-2 rounded-xl overflow-hidden cursor-pointer transition ${img.selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300'}`}
                            onClick={() => toggleImageSelection(img.id)}
                          >
                            <img src={img.url} alt={img.keyword} className="w-full h-40 object-cover" />
                            <div className="p-2">
                              <p className="text-xs font-medium text-slate-700 truncate">{img.keyword}</p>
                              <p className="text-[10px] text-slate-400 truncate">{img.prompt}</p>
                            </div>
                            {img.selected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                ✓
                              </div>
                            )}
                            {/* Individual insert button */}
                            <div className="absolute top-2 left-2">
                              <select
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  if (e.target.value) insertSingleImage(img, e.target.value);
                                  e.target.value = '';
                                }}
                                className="text-[10px] bg-white/90 border border-slate-300 rounded px-1 py-0.5"
                                defaultValue=""
                              >
                                <option value="" disabled>➕ 插入到...</option>
                                {insertionPoints.map(p => (
                                  <option key={p.heading} value={p.heading}>{p.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Batch insert selected */}
                      {generatedImages.some(img => img.selected) && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                          <span className="text-xs text-purple-700 font-medium">
                            已选择 {generatedImages.filter(img => img.selected).length} 张
                          </span>
                          <select
                            value={selectedInsertPoint}
                            onChange={e => setSelectedInsertPoint(e.target.value)}
                            className="flex-1 text-xs border border-purple-300 rounded-lg px-2 py-1.5"
                          >
                            <option value="">选择插入位置...</option>
                            {insertionPoints.map(p => (
                              <option key={p.heading} value={p.heading}>{p.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={insertSelectedImages}
                            disabled={!selectedInsertPoint}
                            className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            插入选中图片
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status + Save */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="draft">草稿 Draft</option>
                <option value="published">发布 Published</option>
                <option value="scheduled">定时 Scheduled</option>
              </select>
              {form.status === 'scheduled' && (
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Visual Editor Component ────────────────────────────────────────────────

function VisualEditor({
  content,
  onChange,
  images,
  onRemoveImage,
  onMoveUp,
  onMoveDown,
}: {
  content: string;
  onChange: (val: string) => void;
  images: InlineImage[];
  onRemoveImage: (img: InlineImage) => void;
  onMoveUp: (img: InlineImage) => void;
  onMoveDown: (img: InlineImage) => void;
}) {
  const segments = useMemo(() => {
    if (!content) return [{ type: 'text' as const, content: '', start: 0, end: 0 }];
    const result: Array<{ type: 'text' | 'image'; content: string; start: number; end: number; image?: InlineImage }> = [];
    let lastEnd = 0;

    const sortedImages = [...images].sort((a, b) => a.index - b.index);

    for (const img of sortedImages) {
      if (img.index > lastEnd) {
        result.push({ type: 'text', content: content.slice(lastEnd, img.index), start: lastEnd, end: img.index });
      }
      result.push({ type: 'image', content: img.fullMatch, start: img.index, end: img.index + img.fullMatch.length, image: img });
      lastEnd = img.index + img.fullMatch.length;
    }

    if (lastEnd < content.length) {
      result.push({ type: 'text', content: content.slice(lastEnd), start: lastEnd, end: content.length });
    }

    if (result.length === 0) {
      result.push({ type: 'text', content: '', start: 0, end: 0 });
    }

    return result;
  }, [content, images]);

  function handleTextChange(segIndex: number, newText: string) {
    const seg = segments[segIndex];
    const before = content.slice(0, seg.start);
    const after = content.slice(seg.end);
    onChange(before + newText + after);
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">🖼 可视化编辑</span>
        <span className="text-[10px] text-slate-400">编辑文字，管理图片位置</span>
      </div>
      <div className="p-4 space-y-2">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return (
              <textarea
                key={`text-${idx}`}
                value={seg.content}
                onChange={e => handleTextChange(idx, e.target.value)}
                className="w-full border border-slate-100 rounded-lg px-3 py-2 text-sm font-mono resize-y hover:border-slate-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition"
                rows={Math.max(3, seg.content.split('\n').length)}
              />
            );
          }

          const img = seg.image!;
          return (
            <div key={`img-${idx}`} className="relative group border border-slate-200 rounded-xl overflow-hidden hover:border-purple-300 transition">
              <img src={img.url} alt={img.alt} className="w-full max-h-64 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => onMoveUp(img)}
                  className="px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-medium shadow hover:bg-slate-100"
                >
                  ⬆️ 上移
                </button>
                <button
                  onClick={() => onMoveDown(img)}
                  className="px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-medium shadow hover:bg-slate-100"
                >
                  ⬇️ 下移
                </button>
                <button
                  onClick={() => onRemoveImage(img)}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium shadow hover:bg-red-600"
                >
                  🗑 删除
                </button>
              </div>
              <div className="absolute top-2 left-2 px-2 py-1 bg-white/80 rounded text-[10px] text-slate-600 backdrop-blur">
                {img.alt || '插图'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Small Components ───────────────────────────────────────────────────────

function AIButton({ label, working, onClick }: { label: string; working: boolean; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.preventDefault(); onClick(); }}
      disabled={working}
      className="ml-2 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50"
    >
      {working ? '⏳...' : label}
    </button>
  );
}
