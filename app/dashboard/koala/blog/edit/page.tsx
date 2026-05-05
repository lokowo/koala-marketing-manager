'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
}

function extractInlineImages(content: string): InlineImage[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: InlineImage[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2], fullMatch: match[0] });
  }
  return images;
}

export default function BlogEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [aiWorking, setAiWorking] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<'zh' | 'en'>('zh');
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
  });

  useEffect(() => {
    if (editId) {
      fetch(`/api/blog?search=&limit=50`)
        .then(r => r.json())
        .then(data => {
          const post = data.posts?.find((p: { id: string }) => p.id === editId);
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
            });
          }
          setLoading(false);
        });
    }
  }, [editId]);

  const inlineImages = useMemo(() => extractInlineImages(form.content_zh), [form.content_zh]);

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
      if (data.imageUrl) {
        setForm(prev => ({ ...prev, cover_image_url: data.imageUrl }));
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

  async function addInlineImage() {
    if (!editId || aiWorking === 'add_inline') return;
    setAiWorking('add_inline');
    try {
      const res = await fetch('/api/blog/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: editId, imageCount: 1 }),
      });
      const data = await res.json();
      if (data.success && data.imagesInserted > 0) {
        const postRes = await fetch(`/api/blog?search=&limit=50`);
        const postData = await postRes.json();
        const updated = postData.posts?.find((p: { id: string }) => p.id === editId);
        if (updated?.content_zh) {
          setForm(prev => ({ ...prev, content_zh: updated.content_zh }));
        }
      } else {
        alert('插图生成失败或无合适位置');
      }
    } catch { alert('插图生成失败'); }
    setAiWorking(null);
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
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  const hasCover = form.cover_image_url && !form.cover_image_url.startsWith('[') && form.cover_image_url.startsWith('http');

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{editId ? '编辑文章' : '新建文章'}</h2>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← 返回列表</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类 Category
              <AIButton label="🔖 AI推荐" working={aiWorking === 'recommend_category'} onClick={() => aiAssist('recommend_category')} />
            </label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签 Tags
              <AIButton label="🏷 AI生成" working={aiWorking === 'generate_tags'} onClick={() => aiAssist('generate_tags')} />
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="逗号分隔标签"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Original Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">原始语言 Original Language</label>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-lg font-medium">中文 Chinese</span>
            <span className="px-3 py-1.5 text-sm text-gray-400 bg-gray-50 rounded-lg">English</span>
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            封面图 Cover Image
          </label>
          {hasCover ? (
            <div className="relative">
              <img src={form.cover_image_url} alt="cover preview" className="rounded-lg w-full max-h-40 object-cover" />
              {editId && (
                <button
                  onClick={generateCover}
                  disabled={aiWorking === 'cover_image'}
                  className="absolute top-2 right-2 px-2.5 py-1 text-xs bg-white/90 text-amber-700 rounded-lg hover:bg-white disabled:opacity-50 font-medium shadow"
                >
                  {aiWorking === 'cover_image' ? '⏳ 生成中(~15s)...' : '🔄 重新生成'}
                </button>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              {aiWorking === 'cover_image' ? (
                <p className="text-sm text-amber-600 animate-pulse">⏳ 封面图生成中(~15s)...</p>
              ) : editId ? (
                <button
                  onClick={generateCover}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  🎨 生成封面图
                </button>
              ) : (
                <p className="text-sm text-gray-400">保存文章后可生成封面图</p>
              )}
            </div>
          )}
          <input
            type="text"
            value={form.cover_image_url}
            onChange={e => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
            placeholder="图片URL（或点击上方按钮AI生成）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2"
          />
        </div>

        {/* Content Tabs */}
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setContentTab('zh')}
              className={`px-3 py-1.5 text-sm rounded-lg ${contentTab === 'zh' ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              中文内容
            </button>
            <button
              onClick={() => setContentTab('en')}
              className={`px-3 py-1.5 text-sm rounded-lg ${contentTab === 'en' ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              English Content
            </button>
            <button
              onClick={() => aiAssist('translate')}
              disabled={aiWorking === 'translate' || !form.content_zh}
              className="ml-auto text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
            >
              {aiWorking === 'translate' ? '⏳ 翻译中...' : '🔄 AI翻译到English'}
            </button>
          </div>

          {contentTab === 'zh' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={form.title_zh}
                onChange={e => setForm(prev => ({ ...prev, title_zh: e.target.value }))}
                placeholder="中文标题"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
              />
              <input
                type="text"
                value={form.excerpt_zh}
                onChange={e => setForm(prev => ({ ...prev, excerpt_zh: e.target.value }))}
                placeholder="中文摘要（100字）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={form.content_zh}
                onChange={e => setForm(prev => ({ ...prev, content_zh: e.target.value }))}
                placeholder="中文正文（Markdown格式）"
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={form.title_en}
                onChange={e => setForm(prev => ({ ...prev, title_en: e.target.value }))}
                placeholder="English Title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
              />
              <input
                type="text"
                value={form.excerpt_en}
                onChange={e => setForm(prev => ({ ...prev, excerpt_en: e.target.value }))}
                placeholder="English Excerpt"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={form.content_en}
                onChange={e => setForm(prev => ({ ...prev, content_en: e.target.value }))}
                placeholder="English Content (Markdown)"
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          )}
        </div>

        {/* Inline Images Management */}
        {editId && contentTab === 'zh' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">文内插图 Inline Images ({inlineImages.length})</label>
            {inlineImages.length > 0 ? (
              <div className="space-y-2">
                {inlineImages.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <img src={img.url} alt={img.alt} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 truncate">{img.alt || '无标题'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{img.url.slice(0, 60)}...</p>
                    </div>
                    <button
                      onClick={() => removeInlineImage(img)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 flex-shrink-0"
                    >
                      🗑 删除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">暂无文内插图</p>
            )}
            <button
              onClick={addInlineImage}
              disabled={aiWorking === 'add_inline'}
              className="mt-2 px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
            >
              {aiWorking === 'add_inline' ? '⏳ 生成中(~20s)...' : '➕ 追加 1 张插图'}
            </button>
          </div>
        )}

        {/* Status + Save */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <select
            value={form.status}
            onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="draft">草稿 Draft</option>
            <option value="published">发布 Published</option>
            <option value="scheduled">定时 Scheduled</option>
          </select>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
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
    </div>
  );
}

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
