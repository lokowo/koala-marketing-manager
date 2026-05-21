'use client';
import { useState, useEffect, useCallback } from 'react';
import { NumberInput } from '../../../../components/ui/number-input';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

interface FAQ {
  id: string;
  category: string;
  keywords: string[];
  answer_zh: string;
  answer_en: string;
  question_patterns: string[];
  rich_card_type: string | null;
  rich_card_data: Record<string, unknown> | null;
  priority: number;
  enabled: boolean;
  created_at: string;
}

interface TestResult {
  id: string;
  category: string;
  answer_zh: string;
  answer_en: string;
  score: number;
  rich_card_type: string | null;
}

export default function FAQManagementPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formAnswerZh, setFormAnswerZh] = useState('');
  const [formAnswerEn, setFormAnswerEn] = useState('');
  const [formRichCardType, setFormRichCardType] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testNoMatch, setTestNoMatch] = useState(false);
  const [testing, setTesting] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState('');

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/ola-faq');
      const data = await resp.json();
      setFaqs(data.faqs ?? []);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  function openCreate() {
    setEditingFaq(null);
    setFormCategory('');
    setFormKeywords('');
    setFormAnswerZh('');
    setFormAnswerEn('');
    setFormRichCardType('');
    setFormPriority(0);
    setShowModal(true);
  }

  function openEdit(faq: FAQ) {
    setEditingFaq(faq);
    setFormCategory(faq.category);
    setFormKeywords(faq.keywords.join(', '));
    setFormAnswerZh(faq.answer_zh);
    setFormAnswerEn(faq.answer_en);
    setFormRichCardType(faq.rich_card_type ?? '');
    setFormPriority(faq.priority);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formCategory.trim() || !formKeywords.trim() || !formAnswerZh.trim() || !formAnswerEn.trim()) return;
    setSaving(true);
    try {
      const body = {
        category: formCategory.trim(),
        keywords: formKeywords.split(/[,，]/).map(k => k.trim()).filter(Boolean),
        answer_zh: formAnswerZh.trim(),
        answer_en: formAnswerEn.trim(),
        rich_card_type: formRichCardType.trim() || null,
        priority: formPriority,
      };

      if (editingFaq) {
        await fetch(`/api/admin/ola-faq/${editingFaq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/admin/ola-faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      fetchFaqs();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/ola-faq/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchFaqs();
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(faq: FAQ) {
    await fetch(`/api/admin/ola-faq/${faq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !faq.enabled }),
    });
    fetchFaqs();
  }

  async function handleTest() {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestNoMatch(false);
    try {
      const resp = await fetch('/api/admin/ola-faq/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testQuery.trim() }),
      });
      const data = await resp.json();
      if (data.match) {
        setTestResult(data.match);
      } else {
        setTestNoMatch(true);
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedResult('');
    try {
      const resp = await fetch('/api/admin/ola-faq/seed', { method: 'POST' });
      const data = await resp.json();
      setSeedResult(data.message || `已插入 ${data.inserted ?? 0} 条 FAQ`);
      fetchFaqs();
    } catch {
      setSeedResult('初始化失败');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">FAQ 管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理 Ola AI 常见问题自动回复（零 LLM 成本）</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeed} disabled={seeding} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 disabled:opacity-50">
            {seeding ? '初始化中...' : '🌱 初始化种子数据'}
          </button>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E]">
            + 新增 FAQ
          </button>
        </div>
      </div>

      {seedResult && (
        <div className="mb-4 p-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">{seedResult}</div>
      )}

      {/* Summary Stats */}
      {!loading && faqs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[13px] text-gray-500 dark:text-gray-400"><MetricLabel label={METRICS.faqTotal.label} tooltip={METRICS.faqTotal.tooltip} /></div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 mt-1">{faqs.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[13px] text-gray-500 dark:text-gray-400"><MetricLabel label={METRICS.faqEnabled.label} tooltip={METRICS.faqEnabled.tooltip} /></div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 mt-1">{faqs.filter(f => f.enabled).length}</div>
          </div>
        </div>
      )}

      {/* Test Panel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">FAQ 匹配测试</h2>
        <div className="flex gap-2">
          <input
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTest()}
            placeholder="输入用户消息测试匹配..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          />
          <button onClick={handleTest} disabled={testing} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {testing ? '测试中...' : '测试'}
          </button>
        </div>
        {testResult && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-green-800 dark:text-green-300">命中!</span>
              <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-xs">{testResult.category}</span>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-xs">匹配分: {(testResult.score * 100).toFixed(0)}%</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{testResult.answer_zh}</p>
          </div>
        )}
        {testNoMatch && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            未匹配到任何 FAQ，将转交 LLM 处理
          </div>
        )}
      </div>

      {/* FAQ List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">暂无 FAQ 条目，点击"初始化种子数据"添加</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">分类</th>
                <th className="px-4 py-3 text-left">关键词</th>
                <th className="px-4 py-3 text-left">中文答案（摘要）</th>
                <th className="px-4 py-3 text-center">优先级</th>
                <th className="px-4 py-3 text-center">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {faqs.map(faq => (
                <tr key={faq.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!faq.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">{faq.category}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {faq.keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">{kw}</span>
                      ))}
                      {faq.keywords.length > 4 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">+{faq.keywords.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[300px] truncate text-gray-600 dark:text-gray-400">{faq.answer_zh.slice(0, 80)}...</td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{faq.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(faq)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${faq.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${faq.enabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(faq)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">编辑</button>
                    <button onClick={() => setDeleteTarget(faq)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editingFaq ? '编辑 FAQ' : '新增 FAQ'}</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">分类 *</label>
                <input value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="如：pricing, credits, usage" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">关键词 *（逗号分隔）</label>
                <input value={formKeywords} onChange={e => setFormKeywords(e.target.value)} placeholder="价格, 多少钱, pricing, cost" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">中文答案 *</label>
                <textarea value={formAnswerZh} onChange={e => setFormAnswerZh(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-vertical" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">英文答案 *</label>
                <textarea value={formAnswerEn} onChange={e => setFormAnswerEn(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-vertical" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rich Card 类型（可选）</label>
                  <input value={formRichCardType} onChange={e => setFormRichCardType(e.target.value)} placeholder="如：pricing_card" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">优先级</label>
                  <NumberInput value={formPriority} onChange={v => setFormPriority(v)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-200">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2A2A3E] disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">确定要删除分类为「{deleteTarget.category}」的 FAQ 条目吗？</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-200">取消</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
