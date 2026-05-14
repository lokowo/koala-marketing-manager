'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface Banner {
  id: string;
  image_url: string;
  image_alt: string | null;
  click_action: 'none' | 'internal_link' | 'external_link' | 'modal';
  click_url: string | null;
  modal_title: string | null;
  modal_content: string | null;
  modal_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Settings {
  auto_play: boolean;
  interval_seconds: number;
  transition_speed: number;
}

const ACTION_LABELS: Record<string, string> = {
  none: '无点击',
  internal_link: '站内链接',
  external_link: '外部链接',
  modal: '弹窗详情',
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<Settings>({ auto_play: true, interval_seconds: 5, transition_speed: 500 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Create form state
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [newAction, setNewAction] = useState<Banner['click_action']>('none');
  const [newUrl, setNewUrl] = useState('');
  const [newModalTitle, setNewModalTitle] = useState('');
  const [newModalContent, setNewModalContent] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [imageTab, setImageTab] = useState<'upload' | 'ai'>('upload');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [newOverlayTitle, setNewOverlayTitle] = useState('');
  const [newOverlaySubtitle, setNewOverlaySubtitle] = useState('');

  // Edit form state
  const [editAlt, setEditAlt] = useState('');
  const [editAction, setEditAction] = useState<Banner['click_action']>('none');
  const [editUrl, setEditUrl] = useState('');
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalContent, setEditModalContent] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editOverlayTitle, setEditOverlayTitle] = useState('');
  const [editOverlaySubtitle, setEditOverlaySubtitle] = useState('');

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const fetchBanners = useCallback(async () => {
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/banners'),
        fetch('/api/admin/banners/settings'),
      ]);
      const bannersData = await bannersRes.json();
      const settingsData = await settingsRes.json();
      setBanners(bannersData.banners || []);
      if (settingsData.settings) setSettings(settingsData.settings);
    } catch {
      flash('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/banners/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { flash(data.error || '上传失败'); return null; }
      return data.url;
    } catch {
      flash('上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    let url: string | null = null;
    if (imageTab === 'ai' && generatedImageUrl) {
      url = generatedImageUrl;
    } else if (imageTab === 'upload' && newImage) {
      setSaving(true);
      url = await uploadImage(newImage);
      if (!url) { setSaving(false); return; }
    } else {
      flash('请选择或生成图片');
      return;
    }
    setSaving(true);

    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: url,
          image_alt: newAlt || null,
          click_action: newAction,
          click_url: (newAction === 'internal_link' || newAction === 'external_link') ? newUrl : null,
          modal_title: newAction === 'modal' ? newModalTitle : null,
          modal_content: newAction === 'modal' ? newModalContent : null,
          overlay_title: newOverlayTitle || null,
          overlay_subtitle: newOverlaySubtitle || null,
          start_date: newStartDate || null,
          end_date: newEndDate || null,
        }),
      });
      if (!res.ok) { flash('创建失败'); setSaving(false); return; }
      flash('Banner 已创建');
      resetCreateForm();
      setShowCreate(false);
      fetchBanners();
    } catch {
      flash('创建失败');
    }
    setSaving(false);
  }

  function resetCreateForm() {
    setNewImage(null);
    setNewImagePreview('');
    setNewAlt('');
    setNewAction('none');
    setNewUrl('');
    setNewModalTitle('');
    setNewModalContent('');
    setNewStartDate('');
    setNewEndDate('');
    setImageTab('upload');
    setAiPrompt('');
    setGeneratedImageUrl('');
    setGenerateError('');
    setNewOverlayTitle('');
    setNewOverlaySubtitle('');
  }

  async function handleGenerateImage() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/admin/banners/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedImageUrl(data.imageUrl);
      } else {
        setGenerateError(data.error || '生成失败，请重试');
      }
    } catch {
      setGenerateError('网络错误，请重试');
    }
    setGenerating(false);
  }

  function openEdit(b: Banner) {
    setEditBanner(b);
    setEditAlt(b.image_alt || '');
    setEditAction(b.click_action);
    setEditUrl(b.click_url || '');
    setEditModalTitle(b.modal_title || '');
    setEditModalContent(b.modal_content || '');
    setEditStartDate(b.start_date ? b.start_date.slice(0, 10) : '');
    setEditEndDate(b.end_date ? b.end_date.slice(0, 10) : '');
    setEditOverlayTitle((b as Banner & { overlay_title?: string }).overlay_title || '');
    setEditOverlaySubtitle((b as Banner & { overlay_subtitle?: string }).overlay_subtitle || '');
  }

  async function handleUpdate() {
    if (!editBanner) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/banners/${editBanner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_alt: editAlt || null,
          click_action: editAction,
          click_url: (editAction === 'internal_link' || editAction === 'external_link') ? editUrl : null,
          modal_title: editAction === 'modal' ? editModalTitle : null,
          modal_content: editAction === 'modal' ? editModalContent : null,
          overlay_title: editOverlayTitle || null,
          overlay_subtitle: editOverlaySubtitle || null,
          start_date: editStartDate || null,
          end_date: editEndDate || null,
        }),
      });
      if (!res.ok) { flash('更新失败'); setSaving(false); return; }
      flash('已更新');
      setEditBanner(null);
      fetchBanners();
    } catch {
      flash('更新失败');
    }
    setSaving(false);
  }

  async function handleToggleActive(b: Banner) {
    try {
      await fetch(`/api/admin/banners/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      fetchBanners();
    } catch {
      flash('操作失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此 Banner？')) return;
    try {
      await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      flash('已删除');
      fetchBanners();
    } catch {
      flash('删除失败');
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...banners];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const items = updated.map((b, i) => ({ id: b.id, sort_order: i }));
    setBanners(updated);
    try {
      await fetch('/api/admin/banners/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch {
      flash('排序失败');
      fetchBanners();
    }
  }

  async function handleMoveDown(index: number) {
    if (index === banners.length - 1) return;
    const updated = [...banners];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const items = updated.map((b, i) => ({ id: b.id, sort_order: i }));
    setBanners(updated);
    try {
      await fetch('/api/admin/banners/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch {
      flash('排序失败');
      fetchBanners();
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/banners/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { flash('保存失败'); setSaving(false); return; }
      flash('设置已保存');
      setShowSettings(false);
    } catch {
      flash('保存失败');
    }
    setSaving(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, target: 'create') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flash('文件不能超过 5MB'); return; }
    if (target === 'create') {
      setNewImage(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-[#9CA3AF]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-[#111827] text-white text-sm rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Banner 管理</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">管理首页轮播 Banner 图</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            ⚙️ 轮播设置
          </button>
          <button
            onClick={() => { resetCreateForm(); setShowCreate(true); }}
            className="px-3 py-2 text-sm rounded-lg text-white font-medium transition-colors"
            style={{ background: '#c9a96e' }}
          >
            + 添加 Banner
          </button>
        </div>
      </div>

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-[#E5E7EB]">
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-sm text-[#9CA3AF]">暂无 Banner</p>
          <button
            onClick={() => { resetCreateForm(); setShowCreate(true); }}
            className="mt-3 text-sm font-medium"
            style={{ color: '#c9a96e' }}
          >
            创建第一个 Banner →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                b.is_active ? 'border-[#E5E7EB] bg-white' : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-60'
              }`}
            >
              {/* Sort controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(i)}
                  disabled={i === 0}
                  className="text-xs text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30 px-1"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveDown(i)}
                  disabled={i === banners.length - 1}
                  className="text-xs text-[#9CA3AF] hover:text-[#374151] disabled:opacity-30 px-1"
                >
                  ▼
                </button>
              </div>

              {/* Image preview */}
              <div className="relative w-36 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#F3F4F6]">
                <Image
                  src={b.image_url}
                  alt={b.image_alt || 'Banner'}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    b.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {b.is_active ? '🟢 启用' : '⚪ 停用'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                    {ACTION_LABELS[b.click_action]}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">#{i + 1}</span>
                </div>
                {b.image_alt && (
                  <p className="text-xs text-[#374151] truncate">{b.image_alt}</p>
                )}
                {b.click_url && (
                  <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{b.click_url}</p>
                )}
                <div className="text-[10px] text-[#9CA3AF] mt-1">
                  {b.start_date && `开始: ${b.start_date.slice(0, 10)}`}
                  {b.start_date && b.end_date && ' · '}
                  {b.end_date && `结束: ${b.end_date.slice(0, 10)}`}
                  {!b.start_date && !b.end_date && '长期展示'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(b)}
                  className="px-2.5 py-1.5 text-[11px] rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                >
                  {b.is_active ? '停用' : '启用'}
                </button>
                <button
                  onClick={() => openEdit(b)}
                  className="px-2.5 py-1.5 text-[11px] rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="px-2.5 py-1.5 text-[11px] rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827]">添加 Banner</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#9CA3AF] hover:text-[#374151]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image source tabs */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">Banner 图片 *</label>
                <div className="flex gap-1 mb-3 bg-[#F3F4F6] rounded-lg p-1">
                  <button
                    onClick={() => setImageTab('upload')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      imageTab === 'upload' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
                    }`}
                  >
                    上传图片
                  </button>
                  <button
                    onClick={() => setImageTab('ai')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      imageTab === 'ai' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
                    }`}
                  >
                    AI 生成
                  </button>
                </div>

                {imageTab === 'upload' && (
                  <>
                    <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg mb-3">
                      📐 推荐尺寸：1024×1024 像素（1:1 正方形）· 支持 JPG/PNG/WebP · 最大 5MB
                    </div>
                    {newImagePreview ? (
                      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#F3F4F6] mb-2">
                        <Image src={newImagePreview} alt="Preview" fill className="object-cover" sizes="100vw" />
                        <button
                          onClick={() => { setNewImage(null); setNewImagePreview(''); }}
                          className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="block w-full h-32 rounded-xl border-2 border-dashed border-[#D1D5DB] flex items-center justify-center cursor-pointer hover:border-[#c9a96e] transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-xs text-[#9CA3AF]">点击上传图片</div>
                          <div className="text-[10px] text-[#D1D5DB] mt-0.5">推荐 1024×1024 或 4:3 比例 · 最大 5MB</div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'create')} />
                      </label>
                    )}
                  </>
                )}

                {imageTab === 'ai' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                      📐 AI 自动生成 1024×1024 像素（1:1 正方形）· 图片不含任何文字
                    </div>
                    <p className="text-xs text-[#6B7280]">描述你想要的图片内容，AI 自动生成专业 Banner</p>
                    <textarea
                      placeholder="例：澳洲大学校园秋天的景色，几位中国留学生在讨论学术研究"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="w-full border border-[#D1D5DB] rounded-lg p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e] resize-none"
                      rows={3}
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: '🏫 大学校园', prompt: '澳洲知名大学校园全景，秋天金色阳光，学术氛围浓厚' },
                        { label: '📚 学术研究', prompt: '中国留学生在现代化图书馆里用笔记本电脑做研究，温暖的阳光照进来' },
                        { label: '🎓 毕业典礼', prompt: 'PhD毕业典礼，穿着学位服的学生们开心地抛帽子庆祝' },
                        { label: '🔬 导师指导', prompt: '教授在实验室里一对一指导学生做科研项目' },
                        { label: '🌏 悉尼风景', prompt: '悉尼歌剧院和海港大桥的全景，远处可见大学建筑群' },
                        { label: '🤖 AI科技', prompt: 'AI科技感界面，展示教授匹配和智能推荐的未来感画面' },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => setAiPrompt(item.prompt)}
                          className="px-2.5 py-1 rounded-lg text-[11px] border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:border-[#c9a96e] transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerateImage}
                      disabled={generating || !aiPrompt.trim()}
                      className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
                      style={{ background: '#1A1A2E' }}
                    >
                      {generating ? '🎨 生成中...预计15秒' : '🎨 生成图片'}
                    </button>
                    {generatedImageUrl && (
                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                        <div className="relative w-full h-40 bg-[#F3F4F6]">
                          <Image src={generatedImageUrl} alt="AI生成预览" fill className="object-cover" sizes="100vw" />
                        </div>
                        <div className="flex gap-2 p-3 bg-[#F9FAFB]">
                          <button
                            onClick={() => {
                              flash('已选择 AI 生成的图片，点击下方"创建 Banner"保存');
                            }}
                            className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                          >
                            ✅ 使用这张
                          </button>
                          <button
                            onClick={handleGenerateImage}
                            disabled={generating}
                            className="flex-1 py-2 rounded-lg text-xs bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
                          >
                            🔄 重新生成
                          </button>
                        </div>
                      </div>
                    )}
                    {generateError && (
                      <p className="text-xs text-red-500">{generateError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Alt text */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">图片描述 (Alt)</label>
                <input
                  type="text"
                  value={newAlt}
                  onChange={e => setNewAlt(e.target.value)}
                  placeholder="描述图片内容..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
              </div>

              {/* Overlay title + subtitle */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">覆盖标题（选填）</label>
                <input
                  type="text"
                  value={newOverlayTitle}
                  onChange={e => setNewOverlayTitle(e.target.value)}
                  placeholder="显示在图片上方的文字，如：在澳大利亚找到你的博士导师"
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">覆盖副标题（选填）</label>
                <input
                  type="text"
                  value={newOverlaySubtitle}
                  onChange={e => setNewOverlaySubtitle(e.target.value)}
                  placeholder="副标题，如：QUT 全奖项目 · $40,000 奖学金"
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
                <p className="text-[10px] text-[#9CA3AF] mt-1">标题/副标题以白色大字覆盖在图片上方（前端 HTML 渲染，文字永远正确）</p>
              </div>

              {/* Click action */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">点击行为</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'internal_link', 'external_link', 'modal'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setNewAction(a)}
                      className={`px-2 py-2 rounded-lg text-[11px] border transition-all ${
                        newAction === a
                          ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E] font-medium'
                          : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional fields */}
              {(newAction === 'internal_link' || newAction === 'external_link') && (
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">
                    {newAction === 'internal_link' ? '站内链接' : '外部链接'}
                  </label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder={newAction === 'internal_link' ? '/koala/professors' : 'https://example.com'}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
              )}

              {newAction === 'modal' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">弹窗标题</label>
                    <input
                      type="text"
                      value={newModalTitle}
                      onChange={e => setNewModalTitle(e.target.value)}
                      placeholder="活动标题..."
                      className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">弹窗内容 (HTML)</label>
                    <textarea
                      value={newModalContent}
                      onChange={e => setNewModalContent(e.target.value)}
                      rows={3}
                      placeholder="<p>活动详情...</p>"
                      className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e] resize-y"
                    />
                  </div>
                </>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">开始日期</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">结束日期</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-[#6B7280] rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || uploading || (imageTab === 'upload' ? !newImage : !generatedImageUrl)}
                className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                style={{ background: '#c9a96e' }}
              >
                {uploading ? '上传中...' : saving ? '保存中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditBanner(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827]">编辑 Banner</h2>
              <button onClick={() => setEditBanner(null)} className="text-[#9CA3AF] hover:text-[#374151]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image preview (read-only for edit) */}
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#F3F4F6]">
                <Image src={editBanner.image_url} alt={editBanner.image_alt || 'Banner'} fill className="object-cover" sizes="100vw" />
              </div>

              {/* Alt text */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">图片描述 (Alt)</label>
                <input
                  type="text"
                  value={editAlt}
                  onChange={e => setEditAlt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                />
              </div>

              {/* Overlay title + subtitle */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">覆盖标题（选填）</label>
                <input
                  type="text"
                  value={editOverlayTitle}
                  onChange={e => setEditOverlayTitle(e.target.value)}
                  placeholder="显示在图片上方的文字"
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">覆盖副标题（选填）</label>
                <input
                  type="text"
                  value={editOverlaySubtitle}
                  onChange={e => setEditOverlaySubtitle(e.target.value)}
                  placeholder="副标题文字"
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
                <p className="text-[10px] text-[#9CA3AF] mt-1">标题/副标题以白色大字覆盖在图片上方</p>
              </div>

              {/* Click action */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">点击行为</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'internal_link', 'external_link', 'modal'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setEditAction(a)}
                      className={`px-2 py-2 rounded-lg text-[11px] border transition-all ${
                        editAction === a
                          ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E] font-medium'
                          : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {(editAction === 'internal_link' || editAction === 'external_link') && (
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">
                    {editAction === 'internal_link' ? '站内链接' : '外部链接'}
                  </label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
              )}

              {editAction === 'modal' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">弹窗标题</label>
                    <input
                      type="text"
                      value={editModalTitle}
                      onChange={e => setEditModalTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">弹窗内容 (HTML)</label>
                    <textarea
                      value={editModalContent}
                      onChange={e => setEditModalContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e] resize-y"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">开始日期</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1.5">结束日期</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                onClick={() => setEditBanner(null)}
                className="px-4 py-2 text-sm text-[#6B7280] rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]"
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                style={{ background: '#c9a96e' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827]">轮播设置</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#9CA3AF] hover:text-[#374151]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Auto play */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-[#374151]">自动播放</label>
                <button
                  onClick={() => setSettings(s => ({ ...s, auto_play: !s.auto_play }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.auto_play ? 'bg-[#c9a96e]' : 'bg-[#D1D5DB]'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.auto_play ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Interval */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-[#374151]">切换间隔</label>
                  <span className="text-sm font-medium text-[#111827]">{settings.interval_seconds}s</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={settings.interval_seconds}
                  onChange={e => setSettings(s => ({ ...s, interval_seconds: Number(e.target.value) }))}
                  className="w-full accent-[#c9a96e]"
                />
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
                  <span>2s</span><span>15s</span>
                </div>
              </div>

              {/* Transition speed */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-[#374151]">过渡速度</label>
                  <span className="text-sm font-medium text-[#111827]">{settings.transition_speed}ms</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={1500}
                  step={100}
                  value={settings.transition_speed}
                  onChange={e => setSettings(s => ({ ...s, transition_speed: Number(e.target.value) }))}
                  className="w-full accent-[#c9a96e]"
                />
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
                  <span>快 200ms</span><span>慢 1500ms</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-[#6B7280] rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                style={{ background: '#c9a96e' }}
              >
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
