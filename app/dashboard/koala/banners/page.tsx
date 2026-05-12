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

  // Edit form state
  const [editAlt, setEditAlt] = useState('');
  const [editAction, setEditAction] = useState<Banner['click_action']>('none');
  const [editUrl, setEditUrl] = useState('');
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalContent, setEditModalContent] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

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
    if (!newImage) { flash('请选择图片'); return; }
    setSaving(true);
    const url = await uploadImage(newImage);
    if (!url) { setSaving(false); return; }

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
              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1.5">Banner 图片 *</label>
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
                      <div className="text-[10px] text-[#D1D5DB] mt-0.5">JPG, PNG, WebP, GIF · 最大 5MB</div>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'create')} />
                  </label>
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
                disabled={saving || uploading || !newImage}
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
