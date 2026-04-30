'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../components/LanguageContext';

const sourceTypes = [
  'Professor Profile',
  'Grant & Funding',
  'Research Topic',
  'Student Case',
  'Research Proposal',
  'University Guide',
];

interface GeneratedContent {
  xiaohongshuPost: string;
  xiaohongshuCarousel: string;
  wechatMoment: string;
  websiteArticle: string;
  linkedinPost: string;
  imagePrompt: string;
  reference: string;
  complianceCheck: string;
}

interface ProfTag {
  id: string;
  name: string;
  university: string;
  title: string;
  hIndex: number;
  researchAreas: string[];
  references?: string;
}

interface GrantTag {
  id: string;
  grantName: string;
  fundingBody: string;
  amount?: string;
}

interface TopicTag {
  id: string;
  name: string;
  description?: string;
}

function buildAutoInput(type: string, item: ProfTag | GrantTag | TopicTag): string {
  if (type === 'Professor Profile') {
    const p = item as ProfTag;
    return [
      `教授姓名：${p.name}`,
      `职称：${p.title || '教授'}`,
      `所在大学：${p.university}`,
      `H-index：${p.hIndex}`,
      `研究方向：${(p.researchAreas || []).join('、')}`,
      p.references ? `研究简介：${p.references}` : '',
    ].filter(Boolean).join('\n');
  }
  if (type === 'Grant & Funding') {
    const g = item as GrantTag;
    return [
      `项目名称：${g.grantName}`,
      `资助机构：${g.fundingBody}`,
      g.amount ? `资助金额：${g.amount}` : '',
    ].filter(Boolean).join('\n');
  }
  if (type === 'Research Topic') {
    const t = item as TopicTag;
    return [
      `研究方向：${t.name}`,
      t.description ? `说明：${t.description}` : '',
    ].filter(Boolean).join('\n');
  }
  return '';
}

export default function ContentGeneratorPage() {
  const { t } = useLanguage();
  const rl = t.contentGenerator.resultLabels;
  const [selectedType, setSelectedType] = useState(sourceTypes[0]);
  const [inputContent, setInputContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profTags, setProfTags] = useState<ProfTag[]>([]);
  const [grantTags, setGrantTags] = useState<GrantTag[]>([]);
  const [topicTags, setTopicTags] = useState<TopicTag[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sourceType = params.get('sourceType');
      const input = params.get('input');
      if (sourceType && sourceTypes.includes(sourceType)) setSelectedType(sourceType);
      if (input) setInputContent(decodeURIComponent(input));
    }
  }, []);

  const loadTags = useCallback(async (type: string) => {
    setTagsLoading(true);
    setTagSearch('');
    setSelectedTag(null);
    try {
      if (type === 'Professor Profile') {
        const r = await fetch('/api/professors?limit=50');
        const d = await r.json();
        setProfTags((d.professors ?? d.data ?? []).map((p: ProfTag) => ({
          id: p.id, name: p.name, university: p.university,
          title: p.title, hIndex: p.hIndex ?? 0,
          researchAreas: p.researchAreas ?? [],
          references: p.references,
        })));
      } else if (type === 'Grant & Funding') {
        const r = await fetch('/api/grants?limit=50');
        const d = await r.json();
        setGrantTags((d.grants ?? d.data ?? []).map((g: GrantTag) => ({
          id: g.id, grantName: g.grantName, fundingBody: g.fundingBody, amount: g.amount,
        })));
      } else if (type === 'Research Topic') {
        const r = await fetch('/api/topics');
        const d = await r.json();
        setTopicTags((d.topics ?? d.data ?? []).map((tp: TopicTag) => ({
          id: tp.id, name: tp.name, description: tp.description,
        })));
      }
    } catch { /* ignore */ } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags(selectedType);
    setInputContent('');
    setGeneratedContent(null);
    setSavedId(null);
    setError(null);
  }, [selectedType, loadTags]);

  function handleTagSelect(item: ProfTag | GrantTag | TopicTag) {
    const tagId = (item as ProfTag).id;
    setSelectedTag(tagId);
    setInputContent(buildAutoInput(selectedType, item));
    setGeneratedContent(null);
    setSavedId(null);
  }

  const handleGenerate = async () => {
    if (!inputContent.trim()) return;
    setGenerating(true);
    setError(null);
    setSavedId(null);
    setGeneratedContent(null);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: selectedType, rawContent: inputContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      setGeneratedContent(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    setSaving(true);
    try {
      const title = inputContent.slice(0, 60) + (inputContent.length > 60 ? '...' : '');
      const res = await fetch('/api/content/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sourceType: selectedType, generated: generatedContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setSavedId(json.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  // Filtered tags based on search
  const filteredProfs = profTags.filter(p =>
    !tagSearch || p.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
    p.university.toLowerCase().includes(tagSearch.toLowerCase()) ||
    (p.researchAreas ?? []).some(a => a.toLowerCase().includes(tagSearch.toLowerCase()))
  );
  const filteredGrants = grantTags.filter(g =>
    !tagSearch || g.grantName.toLowerCase().includes(tagSearch.toLowerCase()) ||
    g.fundingBody.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const filteredTopics = topicTags.filter(tp =>
    !tagSearch || tp.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const results: { title: string; content: string }[] = generatedContent ? [
    { title: rl.xiaohongshuPost, content: generatedContent.xiaohongshuPost },
    { title: rl.xiaohongshuCarousel, content: generatedContent.xiaohongshuCarousel },
    { title: rl.wechatMoment, content: generatedContent.wechatMoment },
    { title: rl.websiteArticle, content: generatedContent.websiteArticle },
    { title: rl.linkedinPost, content: generatedContent.linkedinPost },
    { title: rl.imagePrompt, content: generatedContent.imagePrompt },
    { title: rl.reference, content: generatedContent.reference },
    { title: rl.complianceCheck, content: generatedContent.complianceCheck },
  ] : [];

  const hasTagSupport = ['Professor Profile', 'Grant & Funding', 'Research Topic'].includes(selectedType);
  const canGenerate = inputContent.trim().length > 0 && !generating;

  return (
    <div className="h-full flex gap-5">
      {/* Left: type + tag selector */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
        {/* Source type tabs */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">内容类型</div>
          <div className="flex flex-col gap-1">
            {sourceTypes.map(s => (
              <button
                key={s}
                onClick={() => setSelectedType(s)}
                className={`text-left text-sm px-3 py-2 rounded-md transition-colors ${
                  selectedType === s
                    ? 'bg-amber-50 text-amber-800 font-medium border border-amber-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tag selector */}
        {hasTagSupport && (
          <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 overflow-hidden min-h-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {selectedType === 'Professor Profile' ? '选择教授' :
               selectedType === 'Grant & Funding' ? '选择项目' : '选择方向'}
            </div>
            <input
              type="text"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="搜索…"
              className="w-full border rounded px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
            <div className="overflow-y-auto flex-1 space-y-1 min-h-0" style={{ maxHeight: 320 }}>
              {tagsLoading && <p className="text-xs text-gray-400 py-2">加载中…</p>}
              {!tagsLoading && selectedType === 'Professor Profile' && filteredProfs.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleTagSelect(p)}
                  className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors ${
                    selectedTag === p.id
                      ? 'bg-amber-100 border border-amber-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-gray-500 truncate">{p.university}</div>
                  {p.hIndex > 0 && <div className="text-amber-600">H-{p.hIndex}</div>}
                </button>
              ))}
              {!tagsLoading && selectedType === 'Grant & Funding' && filteredGrants.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleTagSelect(g)}
                  className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors ${
                    selectedTag === g.id
                      ? 'bg-amber-100 border border-amber-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">{g.grantName}</div>
                  <div className="text-gray-500 truncate">{g.fundingBody}</div>
                </button>
              ))}
              {!tagsLoading && selectedType === 'Research Topic' && filteredTopics.map(tp => (
                <button
                  key={tp.id}
                  onClick={() => handleTagSelect(tp)}
                  className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors ${
                    selectedTag === tp.id
                      ? 'bg-amber-100 border border-amber-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">{tp.name}</div>
                </button>
              ))}
              {!tagsLoading && selectedType === 'Professor Profile' && filteredProfs.length === 0 && (
                <p className="text-xs text-gray-400 py-2">暂无教授数据</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Middle: input + generate */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3 flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {selectedTag || !hasTagSupport ? '素材预览 / 编辑' : '素材输入'}
          </div>
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={
              hasTagSupport
                ? '← 点击左侧标签自动填入素材，也可手动输入…'
                : t.contentGenerator.inputPlaceholder
            }
            className="flex-1 p-2 border rounded resize-none text-sm outline-none focus:border-amber-400"
            style={{ minHeight: 200 }}
          />
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: canGenerate ? '#c4a050' : '#d1d5db' }}
          >
            {generating ? '生成中…' : '✨ 一键生成内容'}
          </button>
          {generating && (
            <p className="text-xs text-gray-400 text-center">调用 Claude API，约 10–30 秒…</p>
          )}
          {error && (
            <div className="text-xs text-red-700 bg-red-50 rounded p-2 border border-red-200">{error}</div>
          )}
        </div>

        {generatedContent && !savedId && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '💾 保存为内容卡片'}
          </button>
        )}
        {savedId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 text-center">
            ✅ 已保存为内容卡片
          </div>
        )}
      </div>

      {/* Right: results */}
      <div className="flex-1 bg-white rounded-lg shadow p-5 overflow-y-auto min-w-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">生成结果</div>
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-sm text-gray-800">{r.title}</h4>
                  <button
                    onClick={() => copyToClipboard(r.content)}
                    className="text-xs bg-gray-100 px-2.5 py-1 rounded hover:bg-gray-200 text-gray-600"
                  >
                    {t.common.copy}
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm">
              {hasTagSupport ? '选择左侧标签，点击「一键生成」' : '填写素材后点击生成'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
