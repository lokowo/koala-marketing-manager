'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SurveySummary {
  total_surveys: number;
  active_surveys: number;
  ended_surveys: number;
  total_valid_responses: number;
  total_registrations: number;
  active_sales_count?: number;
}

interface SurveyRow {
  id: string;
  title: string;
  status: string;
  total_scans: number;
  total_responses: number;
  valid_responses: number;
  invalid_responses: number;
  completion_rate: number;
  registrations: number;
  registration_rate: number;
  sales_count?: number;
}

interface SalesRow {
  user_id: string;
  name: string;
  total_scans: number;
  valid_responses: number;
  invalid_responses: number;
  registrations: number;
  conversion_rate: number;
  last_active: string | null;
  daily_breakdown: DayRow[];
}

interface DayRow {
  date: string;
  new_responses: number;
  valid: number;
  invalid: number;
  registrations: number;
  follow_up_actions: number;
  status: 'active' | 'warning' | 'inactive';
}

interface ClientRow {
  response_id: string;
  name: string;
  phone: string;
  email: string;
  wechat: string;
  is_valid: boolean;
  is_registered: boolean;
  follow_up_status: string;
  follow_up_notes: string;
  last_follow_up: string | null;
  value_score: number;
  completed_at: string | null;
  answer_summary: Record<string, unknown>;
  idle_warning: boolean;
}

// ─── Main Content ───────────────────────────────────────────────────────────

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const surveyId = searchParams.get('survey');
  const salesId = searchParams.get('sales');

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Layer 1 state
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);

  // Layer 2 state
  const [surveyTitle, setSurveyTitle] = useState('');
  const [salesList, setSalesList] = useState<SalesRow[]>([]);
  const [expandedSales, setExpandedSales] = useState<string | null>(null);

  // Layer 3 state
  const [salesName, setSalesName] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => setRole(d.role || null)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      let url = '/api/admin/survey-overview';
      const params = new URLSearchParams();
      if (surveyId) params.set('survey_id', surveyId);
      if (salesId) params.set('sales_id', salesId);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();

      if (surveyId && salesId) {
        setSurveyTitle(data.survey?.title || '');
        setSalesName(data.sales?.name || '');
        setClients(data.clients || []);
      } else if (surveyId) {
        setSurveyTitle(data.survey?.title || '');
        setSalesList(data.sales || []);
      } else {
        setSummary(data.summary || null);
        setSurveys(data.surveys || []);
      }
    } catch { /* handled by loading state */ }
    setLoading(false);
  }, [role, surveyId, salesId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!role) return null;
  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">加载数据...</div>;

  // Determine layer
  if (surveyId && salesId) {
    return <Layer3 surveyId={surveyId} surveyTitle={surveyTitle} salesId={salesId} salesName={salesName}
      clients={clients} expandedClient={expandedClient} setExpandedClient={setExpandedClient} router={router} />;
  }
  if (surveyId) {
    return <Layer2 surveyId={surveyId} surveyTitle={surveyTitle} salesList={salesList}
      expandedSales={expandedSales} setExpandedSales={setExpandedSales} router={router} />;
  }
  return <Layer1 summary={summary} surveys={surveys} role={role} router={router} />;
}

// ─── Layer 1: Survey Overview ───────────────────────────────────────────────

function Layer1({ summary, surveys, role, router }: {
  summary: SurveySummary | null; surveys: SurveyRow[]; role: string;
  router: ReturnType<typeof useRouter>;
}) {
  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/koala/surveys" className="text-slate-400 hover:text-slate-600 text-sm no-underline">&larr; 返回</Link>
        <h1 className="text-lg font-bold text-slate-800">问卷总览</h1>
      </div>

      {summary && (
        <div className={`grid gap-4 ${isSuperAdmin ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-2 lg:grid-cols-5'}`}>
          <StatCard label="总问卷" value={summary.total_surveys} />
          <StatCard label="进行中" value={summary.active_surveys} color="green" />
          <StatCard label="已结束" value={summary.ended_surveys} color="gray" />
          <StatCard label="有效回复" value={summary.total_valid_responses} color="blue" />
          <StatCard label="注册转化" value={summary.total_registrations} color="amber" />
          {isSuperAdmin && summary.active_sales_count !== undefined && (
            <StatCard label="活跃 Sales" value={summary.active_sales_count} color="purple" />
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-slate-500 font-medium">问卷名称</th>
              <th className="px-4 py-3 text-slate-500 font-medium">状态</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">总扫码</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">总填写</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">有效</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">无效</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">有效率</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">注册转化</th>
              {isSuperAdmin && <th className="px-4 py-3 text-slate-500 font-medium text-right">Sales</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map(s => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-800 font-medium">{s.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    s.status === '进行中' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                  }`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-right">{s.total_scans}</td>
                <td className="px-4 py-3 text-slate-600 text-right">{s.total_responses}</td>
                <td className="px-4 py-3 text-green-600 text-right font-medium">{s.valid_responses}</td>
                <td className="px-4 py-3 text-red-500 text-right">{s.invalid_responses}</td>
                <td className="px-4 py-3 text-slate-600 text-right">{s.completion_rate}%</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-amber-600 font-medium">{s.registrations}</span>
                  <span className="text-slate-400 text-xs ml-1">({s.registration_rate}%)</span>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3 text-slate-600 text-right">{s.sales_count ?? 0}人</td>
                )}
                <td className="px-4 py-3 text-right">
                  {isSuperAdmin ? (
                    <button onClick={() => router.push(`/dashboard/koala/surveys/analytics?survey=${s.id}`)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                      详情 →
                    </button>
                  ) : (
                    <Link href={`/dashboard/koala/surveys/analytics?id=${s.id}`}
                      className="text-xs text-slate-500 hover:text-slate-700 no-underline">
                      图表
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {surveys.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">暂无问卷</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Layer 2: Sales Breakdown ───────────────────────────────────────────────

function Layer2({ surveyId, surveyTitle, salesList, expandedSales, setExpandedSales, router }: {
  surveyId: string; surveyTitle: string; salesList: SalesRow[];
  expandedSales: string | null; setExpandedSales: (id: string | null) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push('/dashboard/koala/surveys/analytics')}
          className="text-amber-600 hover:text-amber-700">问卷总览</button>
        <span className="text-slate-300">›</span>
        <span className="text-slate-700 font-medium">{surveyTitle}</span>
      </div>

      <h1 className="text-lg font-bold text-slate-800">Sales 业绩分解</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-slate-500 font-medium w-8">#</th>
              <th className="px-4 py-3 text-slate-500 font-medium">Sales 名称</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">总扫码</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">有效</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">无效</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">注册</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">转化率</th>
              <th className="px-4 py-3 text-slate-500 font-medium">最近活跃</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {salesList.map((s, i) => (
              <SalesRowBlock key={s.user_id} index={i + 1} sales={s} surveyId={surveyId}
                expanded={expandedSales === s.user_id}
                onToggle={() => setExpandedSales(expandedSales === s.user_id ? null : s.user_id)}
                router={router} />
            ))}
            {salesList.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">暂无 Sales 参与此问卷</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesRowBlock({ index, sales, surveyId, expanded, onToggle, router }: {
  index: number; sales: SalesRow; surveyId: string; expanded: boolean;
  onToggle: () => void; router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50/50">
        <td className="px-4 py-3 text-slate-400">{index}</td>
        <td className="px-4 py-3 text-slate-800 font-medium">{sales.name}</td>
        <td className="px-4 py-3 text-slate-600 text-right">{sales.total_scans}</td>
        <td className="px-4 py-3 text-green-600 text-right font-medium">{sales.valid_responses}</td>
        <td className="px-4 py-3 text-red-500 text-right">{sales.invalid_responses}</td>
        <td className="px-4 py-3 text-amber-600 text-right font-medium">{sales.registrations}</td>
        <td className="px-4 py-3 text-slate-600 text-right">{sales.conversion_rate}%</td>
        <td className="px-4 py-3 text-slate-500 text-xs">{formatRelative(sales.last_active)}</td>
        <td className="px-4 py-3 text-right space-x-2">
          <button onClick={onToggle} className="text-xs text-slate-400 hover:text-slate-600">
            {expanded ? '收起' : '展开'}
          </button>
          <button onClick={() => router.push(`/dashboard/koala/surveys/analytics?survey=${surveyId}&sales=${sales.user_id}`)}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium">
            查看
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-6 py-3 bg-slate-50/80">
            <div className="text-xs text-slate-500 mb-2 font-medium">最近 14 天每日明细</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-1.5 text-left font-medium">日期</th>
                  <th className="py-1.5 text-right font-medium">新回复</th>
                  <th className="py-1.5 text-right font-medium">有效</th>
                  <th className="py-1.5 text-right font-medium">无效</th>
                  <th className="py-1.5 text-right font-medium">注册</th>
                  <th className="py-1.5 text-right font-medium">跟进操作</th>
                  <th className="py-1.5 text-left font-medium pl-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {sales.daily_breakdown.slice().reverse().map(d => (
                  <tr key={d.date} className={`border-t border-slate-100 ${
                    d.status === 'warning' ? 'bg-amber-50/50' : d.status === 'inactive' ? 'bg-red-50/30' : ''
                  }`}>
                    <td className="py-1.5 text-slate-600">{d.date.slice(5)}</td>
                    <td className="py-1.5 text-slate-600 text-right">{d.new_responses}</td>
                    <td className="py-1.5 text-green-600 text-right">{d.valid}</td>
                    <td className="py-1.5 text-red-500 text-right">{d.invalid}</td>
                    <td className="py-1.5 text-amber-600 text-right">{d.registrations}</td>
                    <td className="py-1.5 text-slate-600 text-right">{d.follow_up_actions}</td>
                    <td className="py-1.5 pl-3">
                      {d.status === 'active' && <span className="text-green-600">✅</span>}
                      {d.status === 'warning' && <span className="text-amber-500">⚠️ 无操作</span>}
                      {d.status === 'inactive' && <span className="text-red-400">🔴 未工作</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Layer 3: Client Details ────────────────────────────────────────────────

function Layer3({ surveyId, surveyTitle, salesId, salesName, clients, expandedClient, setExpandedClient, router }: {
  surveyId: string; surveyTitle: string; salesId: string; salesName: string;
  clients: ClientRow[]; expandedClient: string | null;
  setExpandedClient: (id: string | null) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const followUpLabels: Record<string, string> = {
    pending: '待跟进', contacted: '已联系', converted: '已转化', lost: '已流失',
  };
  const followUpColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-500',
    contacted: 'bg-blue-100 text-blue-600',
    converted: 'bg-green-100 text-green-600',
    lost: 'bg-red-100 text-red-500',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push('/dashboard/koala/surveys/analytics')}
          className="text-amber-600 hover:text-amber-700">问卷总览</button>
        <span className="text-slate-300">›</span>
        <button onClick={() => router.push(`/dashboard/koala/surveys/analytics?survey=${surveyId}`)}
          className="text-amber-600 hover:text-amber-700">{surveyTitle}</button>
        <span className="text-slate-300">›</span>
        <span className="text-slate-700 font-medium">{salesName}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">{salesName} 的客户列表</h1>
        <span className="text-sm text-slate-400">共 {clients.length} 位客户</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-slate-500 font-medium">姓名</th>
              <th className="px-4 py-3 text-slate-500 font-medium">手机</th>
              <th className="px-4 py-3 text-slate-500 font-medium">邮箱</th>
              <th className="px-4 py-3 text-slate-500 font-medium">微信</th>
              <th className="px-4 py-3 text-slate-500 font-medium">有效性</th>
              <th className="px-4 py-3 text-slate-500 font-medium">注册</th>
              <th className="px-4 py-3 text-slate-500 font-medium">跟进状态</th>
              <th className="px-4 py-3 text-slate-500 font-medium">最后跟进</th>
              <th className="px-4 py-3 text-slate-500 font-medium text-right">价值评分</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <>
                <tr key={c.response_id}
                  className={`border-t border-slate-100 cursor-pointer transition-colors ${
                    c.idle_warning ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'
                  } ${expandedClient === c.response_id ? 'bg-amber-50' : ''}`}
                  onClick={() => setExpandedClient(expandedClient === c.response_id ? null : c.response_id)}>
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {c.name}
                    {c.idle_warning && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-600">未及时跟进</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.wechat}</td>
                  <td className="px-4 py-3">
                    {c.is_valid
                      ? <span className="text-xs text-green-600">✅有效</span>
                      : <span className="text-xs text-red-500">🔴无效</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_registered
                      ? <span className="text-xs text-green-600">✅已注册</span>
                      : <span className="text-xs text-slate-400">❌未注册</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${followUpColors[c.follow_up_status] || followUpColors.pending}`}>
                      {followUpLabels[c.follow_up_status] || '待跟进'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatRelative(c.last_follow_up)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-amber-500">⭐</span>
                    <span className="text-slate-700 font-medium ml-0.5">{c.value_score}</span>
                  </td>
                </tr>
                {expandedClient === c.response_id && (
                  <tr key={c.response_id + '-detail'}>
                    <td colSpan={9} className="px-6 py-4 bg-slate-50/80">
                      <div className="text-xs text-slate-500 mb-2 font-medium">问卷回答摘要</div>
                      {c.follow_up_notes && (
                        <div className="mb-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                          <span className="font-medium">Sales 备注：</span> {c.follow_up_notes}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(c.answer_summary).map(([q, a]) => (
                          <div key={q} className="text-xs">
                            <span className="text-slate-400">{q}：</span>
                            <span className="text-slate-700">{formatAnswer(a)}</span>
                          </div>
                        ))}
                        {Object.keys(c.answer_summary).length === 0 && (
                          <div className="text-xs text-slate-400">暂无回答数据</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">暂无客户</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-100',
    gray: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  const cls = color ? colors[color] || colors.gray : 'bg-white text-slate-800 border-slate-200';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">加载中...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
