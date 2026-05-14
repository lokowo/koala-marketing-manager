'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

interface TextLayer {
  id: string;
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  x: number;
  y: number;
  direction: 'horizontal' | 'vertical';
}

interface OverlayConfig {
  layers: TextLayer[];
  backdropOpacity: number;
}

interface Banner {
  id: string;
  image_url: string;
  image_alt: string | null;
  click_action: 'none' | 'internal_link' | 'external_link' | 'modal';
  click_url: string | null;
  modal_title: string | null;
  modal_content: string | null;
  modal_image_url: string | null;
  overlay_title: string | null;
  overlay_subtitle: string | null;
  overlay_config: OverlayConfig | null;
  is_active: boolean;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const PRESET_COLORS = [
  { label: '白', value: '#ffffff' },
  { label: '黑', value: '#000000' },
  { label: '金', value: '#D4A843' },
  { label: 'Teal', value: '#4ECDC4' },
];

function generateAlt(prompt: string): string {
  let alt = prompt.slice(0, 60);
  const lastComma = alt.lastIndexOf('，');
  const lastPeriod = alt.lastIndexOf('。');
  const cutAt = Math.max(lastComma, lastPeriod);
  if (cutAt > 20) alt = alt.slice(0, cutAt);
  return alt;
}

function newLayer(): TextLayer {
  return { id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, text: '新文字', fontSize: 24, fontWeight: 'normal', color: '#ffffff', x: 50, y: 50, direction: 'horizontal' };
}

function OverlayEditor({ config, onChange, imageUrl }: { config: OverlayConfig; onChange: (c: OverlayConfig) => void; imageUrl: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ layerId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    onChange({ ...config, layers: config.layers.map(l => l.id === id ? { ...l, ...patch } : l) });
  }

  function removeLayer(id: string) {
    onChange({ ...config, layers: config.layers.filter(l => l.id !== id) });
  }

  function addLayer() {
    if (config.layers.length >= 5) return;
    onChange({ ...config, layers: [...config.layers, newLayer()] });
  }

  function handlePointerDown(layerId: string, e: React.PointerEvent) {
    e.preventDefault();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const layer = config.layers.find(l => l.id === layerId);
    if (!layer) return;
    dragRef.current = { layerId, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const x = Math.max(0, Math.min(100, Math.round(dragRef.current.origX + dx)));
    const y = Math.max(0, Math.min(100, Math.round(dragRef.current.origY + dy)));
    updateLayer(dragRef.current.layerId, { x, y });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#374151]">文字图层</label>
        <button onClick={addLayer} disabled={config.layers.length >= 5} className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40">+ 添加文字</button>
      </div>

      {/* Preview */}
      {imageUrl && (
        <div
          ref={previewRef}
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#F3F4F6] select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Image src={imageUrl} alt="Preview" fill className="object-cover pointer-events-none" sizes="400px" />
          {config.backdropOpacity > 0 && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${config.backdropOpacity / 100})` }} />
          )}
          {config.layers.map(layer => (
            <div
              key={layer.id}
              onPointerDown={e => handlePointerDown(layer.id, e)}
              className="absolute touch-none"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${layer.fontSize}px`,
                fontWeight: layer.fontWeight,
                color: layer.color,
                writingMode: layer.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                cursor: 'grab',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {layer.text || '…'}
            </div>
          ))}
        </div>
      )}

      {/* Layer controls */}
      {config.layers.map((layer, idx) => (
        <div key={layer.id} className="rounded-xl border border-[#E5E7EB] p-3 space-y-2.5 bg-[#FAFAFA]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#6B7280]">图层 {idx + 1}</span>
            <button onClick={() => removeLayer(layer.id)} className="text-[10px] text-red-500 hover:text-red-700">删除</button>
          </div>
          <input
            type="text" value={layer.text} onChange={e => updateLayer(layer.id, { text: e.target.value })}
            placeholder="输入文字"
            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:outline-none focus:border-[#c9a96e]"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-[#9CA3AF]">字号</span>
                <span className="text-[10px] font-medium text-[#374151]">{layer.fontSize}px</span>
              </div>
              <input type="range" min={12} max={60} value={layer.fontSize} onChange={e => updateLayer(layer.id, { fontSize: Number(e.target.value) })} className="w-full accent-[#c9a96e] h-1" />
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => updateLayer(layer.id, { fontWeight: 'normal' })} className={`px-2 py-1 rounded text-[10px] border ${layer.fontWeight === 'normal' ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E]' : 'border-[#E5E7EB] text-[#9CA3AF]'}`}>细</button>
              <button onClick={() => updateLayer(layer.id, { fontWeight: 'bold' })} className={`px-2 py-1 rounded text-[10px] font-bold border ${layer.fontWeight === 'bold' ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E]' : 'border-[#E5E7EB] text-[#9CA3AF]'}`}>粗</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#9CA3AF] shrink-0">颜色</span>
            <div className="flex gap-1">
              {PRESET_COLORS.map(c => (
                <button key={c.value} onClick={() => updateLayer(layer.id, { color: c.value })}
                  className={`size-6 rounded-full border-2 ${layer.color === c.value ? 'border-[#c9a96e] ring-2 ring-[#c9a96e]/30' : 'border-[#E5E7EB]'}`}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
              <input type="color" value={layer.color} onChange={e => updateLayer(layer.id, { color: e.target.value })} className="size-6 rounded cursor-pointer border-0 p-0" title="自定义" />
            </div>
            <div className="flex gap-0.5 ml-auto">
              <button onClick={() => updateLayer(layer.id, { direction: 'horizontal' })} className={`px-2 py-1 rounded text-[10px] border ${layer.direction === 'horizontal' ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E]' : 'border-[#E5E7EB] text-[#9CA3AF]'}`}>横</button>
              <button onClick={() => updateLayer(layer.id, { direction: 'vertical' })} className={`px-2 py-1 rounded text-[10px] border ${layer.direction === 'vertical' ? 'border-[#c9a96e] bg-[#FFFBEB] text-[#92400E]' : 'border-[#E5E7EB] text-[#9CA3AF]'}`}>竖</button>
            </div>
          </div>
        </div>
      ))}

      {/* Backdrop opacity */}
      {config.layers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-[#9CA3AF]">背景遮罩</span>
            <span className="text-[10px] font-medium text-[#374151]">{config.backdropOpacity}%</span>
          </div>
          <input type="range" min={0} max={80} value={config.backdropOpacity} onChange={e => onChange({ ...config, backdropOpacity: Number(e.target.value) })} className="w-full accent-[#c9a96e] h-1" />
        </div>
      )}
    </div>
  );
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
  const [newOverlayConfig, setNewOverlayConfig] = useState<OverlayConfig>({ layers: [], backdropOpacity: 0 });

  // Edit form state
  const [editAlt, setEditAlt] = useState('');
  const [editAction, setEditAction] = useState<Banner['click_action']>('none');
  const [editUrl, setEditUrl] = useState('');
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalContent, setEditModalContent] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editOverlayConfig, setEditOverlayConfig] = useState<OverlayConfig>({ layers: [], backdropOpacity: 0 });

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
          overlay_config: newOverlayConfig.layers.length > 0 ? newOverlayConfig : null,
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
    setNewOverlayConfig({ layers: [], backdropOpacity: 0 });
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
        setNewAlt(generateAlt(aiPrompt));
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
    setEditOverlayConfig(b.overlay_config || { layers: [], backdropOpacity: 0 });
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
          overlay_config: editOverlayConfig.layers.length > 0 ? editOverlayConfig : null,
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
      const altFromName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setNewAlt(altFromName);
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
                      📐 推荐尺寸：1536×1024 像素（3:2 横版）· 支持 JPG/PNG/WebP · 最大 5MB
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
                          <div className="text-[10px] text-[#D1D5DB] mt-0.5">推荐 1536×1024（3:2 横版）· 最大 5MB</div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'create')} />
                      </label>
                    )}
                  </>
                )}

                {imageTab === 'ai' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                      📐 AI 自动生成 1536×1024 像素（3:2 横版）· 图片不含任何文字
                    </div>
                    <p className="text-xs text-[#6B7280]">描述你想要的图片内容，AI 自动生成专业 Banner</p>
                    <p className="text-xs text-[#9CA3AF] italic">🎬 AI 将生成真实摄影风格的图片（柯达胶片色调 · 自然光 · 浅景深）</p>
                    <textarea
                      placeholder="例：澳洲大学校园秋天的景色，几位中国留学生在讨论学术研究"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="w-full border border-[#D1D5DB] rounded-lg p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e] resize-none"
                      rows={3}
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: '🏫 大学校园', prompts: [
                          '澳洲顶尖大学的砂岩主楼前，两位中国留学生背着书包走在林荫道上，秋天的金色梧桐叶飘落，阳光透过树枝洒在草坪上，远处有其他学生坐在草地上看书',
                          '悉尼大学哥特式教学楼的拱门走廊，一位亚洲女生抱着笔记本走过，走廊尽头是阳光明媚的庭院，墙上爬满了常青藤',
                          '墨尔本大学校园的清晨，草坪上有薄雾，远处是标志性的钟塔，几个学生骑自行车经过，画面安静温暖',
                          'UNSW 现代化的图书馆建筑外观，玻璃幕墙反射着蓝天白云，前面的广场上有学生坐在台阶上聊天喝咖啡',
                          'ANU 校园里的湖边小路，一位中国男生坐在长椅上看书，背景是澳洲特有的桉树和蓝天，湖面有倒影',
                        ]},
                        { label: '📚 学术研究', prompts: [
                          '现代化大学图书馆里，一位戴眼镜的亚洲女研究生在靠窗座位用MacBook写论文，桌上有一杯拿铁和几本打开的学术期刊，窗外是校园绿树',
                          '明亮的生物实验室里，一位亚洲男研究生正在显微镜前观察样本，旁边的导师在记录数据，实验台上有整齐的试管和器材',
                          '大学研讨室里，四个来自不同国家的PhD学生围着白板讨论研究方案，白板上画满了图表和公式，桌上散落着论文打印稿',
                          '安静的大学阅览室角落，一位亚洲女生面前摊开三本厚书和一个平板电脑，正在认真做笔记，台灯的暖光照在她的侧脸上',
                          '工程学院的工作坊里，一位亚洲学生戴着护目镜操作3D打印机，身后的架子上摆满了各种项目原型模型',
                        ]},
                        { label: '🎓 毕业典礼', prompts: [
                          '一群穿着黑色学位服的毕业生在大学主楼前的大台阶上欢呼庆祝，有人把学位帽抛向蓝天，阳光灿烂，每个人脸上都是灿烂的笑容',
                          '一位亚洲女博士毕业生手捧毕业证书站在校园花园里，她的导师站在旁边微笑着，背景是盛开的蓝花楹',
                          '毕业典礼结束后，一对中国留学生情侣穿着学位服在校园草坪上拍合照，夕阳的光打在他们身上，画面温馨',
                          '大学礼堂内的毕业典礼现场，舞台上一位亚洲学生正在接受校长颁发的博士学位证书，台下家人在鼓掌',
                        ]},
                        { label: '🔬 导师指导', prompts: [
                          '教授办公室里，一位白发教授和亚洲PhD学生面对面坐着讨论论文，桌上摊开着标注了红色批注的打印稿，书架上堆满了学术著作',
                          '实验室里，导师指着屏幕上的数据图表给学生讲解，两人表情专注，周围是先进的科研设备',
                          '校园咖啡厅的户外座位，一位年轻教授和两位亚洲研究生轻松地聊天讨论，桌上有笔记本和咖啡，氛围融洽',
                        ]},
                        { label: '🌏 悉尼风景', prompts: [
                          '悉尼歌剧院和海港大桥的黄金时刻全景，夕阳将天空染成橙红色，前景是波光粼粼的海面和几艘帆船',
                          '从悉尼大学校园高处俯瞰城市天际线，远处是海港大桥，近处是绿树成荫的校园，蓝天白云',
                          '邦迪海滩的清晨，几位年轻人在海边慢跑，远处是彩色的冲浪板和金色的沙滩，海水是清澈的蓝绿色',
                        ]},
                        { label: '🤖 AI科技', prompts: [
                          '未来感的全息投影界面悬浮在空中，显示教授匹配算法的网络图谱，蓝色和金色的数据流在节点间流动，背景是暗色调的实验室',
                          '一位学生面前浮现出半透明的AI助手界面，屏幕上显示着教授推荐列表和匹配度百分比，科技蓝色光芒照亮面部',
                          '抽象的数据可视化画面，无数光点连成知识图谱网络，中心是一个发光的考拉Logo，代表AI智能连接学生与导师',
                        ]},
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => setAiPrompt(item.prompts[Math.floor(Math.random() * item.prompts.length)])}
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
                <label className="block text-xs font-medium text-[#374151] mb-1.5">图片描述 (Alt){newAlt ? ' · 已自动生成，可修改' : ''}</label>
                <input
                  type="text"
                  value={newAlt}
                  onChange={e => setNewAlt(e.target.value)}
                  maxLength={100}
                  placeholder="描述图片内容..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#c9a96e]"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">建议 50-80 字符，简短描述图片内容用于 SEO</p>
                {newAlt.length > 80 && (
                  <p className="text-xs text-amber-500 mt-1">⚠️ 已 {newAlt.length}/100 字符，建议精简</p>
                )}
              </div>

              {/* Overlay editor */}
              <OverlayEditor
                config={newOverlayConfig}
                onChange={setNewOverlayConfig}
                imageUrl={generatedImageUrl || newImagePreview}
              />

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

              {/* Overlay editor */}
              <OverlayEditor
                config={editOverlayConfig}
                onChange={setEditOverlayConfig}
                imageUrl={editBanner.image_url}
              />

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
