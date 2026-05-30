'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconUser, IconRefresh } from '@tabler/icons-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3?: any;
  }
}

const D3_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js';

type Category = 'center' | 'personality' | 'interests' | 'pain_points' | 'conversion' | 'stage';

interface GraphNode {
  id: string;
  label: string;
  category: Category;
  detail?: string;
  size?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  category: Category;
}

interface UserItem {
  user_id: string;
  display_name: string;
  email: string | null;
  mbti_type: string | null;
  total_conversations: number;
  intimacy_score: number;
  sales_stage: string;
  last_chat_at: string | null;
}

interface GraphResponse {
  user: {
    user_id: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    mbti_type: string | null;
    sales_stage: string;
    total_conversations: number;
    total_turns: number;
    intimacy_score: number;
    last_chat_at: string | null;
  };
  nodes: GraphNode[];
  links: GraphLink[];
  chat_playbook: string | null;
  chat_playbook_updated_at: string | null;
}

const CATEGORY_LABEL: Record<Category, string> = {
  center: '中心客户',
  personality: '性格',
  interests: '兴趣',
  pain_points: '痛点',
  conversion: '转化点',
  stage: '阶段',
};

type Palette = { fill: string; stroke: string; text: string; glow: string };

// 浅色模式：浅填充 + 深字（卡片底/白底背景）
const LIGHT_PALETTE: Record<Category, Palette> = {
  center:      { fill: '#1E293B', stroke: '#0F172A', text: '#F8FAFC', glow: 'rgba(30,41,59,0.18)' },
  personality: { fill: '#DDD6FE', stroke: '#7C3AED', text: '#3B0764', glow: 'rgba(124,58,237,0.18)' }, // 紫
  interests:   { fill: '#CFFAFE', stroke: '#0891B2', text: '#063B46', glow: 'rgba(8,145,178,0.18)' },  // 青
  pain_points: { fill: '#FECACA', stroke: '#DC2626', text: '#4A0D0D', glow: 'rgba(220,38,38,0.18)' },  // 红
  conversion:  { fill: '#FDE68A', stroke: '#D97706', text: '#3B2200', glow: 'rgba(217,119,6,0.18)' },  // 琥珀
  stage:       { fill: '#BBF7D0', stroke: '#16A34A', text: '#052E14', glow: 'rgba(22,163,74,0.18)' },  // 绿
};

// 深色模式：深填充 + 浅字（深底卡片背景）
const DARK_PALETTE: Record<Category, Palette> = {
  center:      { fill: '#475569', stroke: '#94A3B8', text: '#F8FAFC', glow: 'rgba(148,163,184,0.20)' },
  personality: { fill: '#4C1D95', stroke: '#A78BFA', text: '#EDE9FE', glow: 'rgba(167,139,250,0.22)' },
  interests:   { fill: '#155E75', stroke: '#67E8F9', text: '#CFFAFE', glow: 'rgba(103,232,249,0.22)' },
  pain_points: { fill: '#7F1D1D', stroke: '#FCA5A5', text: '#FECACA', glow: 'rgba(252,165,165,0.22)' },
  conversion: { fill: '#78350F', stroke: '#FCD34D', text: '#FEF3C7', glow: 'rgba(252,211,77,0.22)' },
  stage:      { fill: '#14532D', stroke: '#86EFAC', text: '#DCFCE7', glow: 'rgba(134,239,172,0.22)' },
};

function useD3() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.d3) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(`script[src="${D3_CDN}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setReady(true), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = D3_CDN;
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// 监听 html.dark 类 + matchMedia(prefers-color-scheme)，得到当前主题
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => root.classList.contains('dark') || (!root.classList.contains('light') && mq.matches);
    setIsDark(compute());
    const observer = new MutationObserver(() => setIsDark(compute()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const onMq = () => setIsDark(compute());
    mq.addEventListener('change', onMq);
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onMq);
    };
  }, []);
  return isDark;
}

export default function MemoryGraphPage() {
  const d3Ready = useD3();
  const isDark = useIsDark();
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/memory-graph');
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch (e) {
      console.error('fetch users', e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchGraph = useCallback(async (userId: string) => {
    setLoadingGraph(true);
    setGraphError(null);
    setGraph(null);
    try {
      const res = await fetch(`/api/admin/memory-graph?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) {
        setGraphError(data.error || '加载失败');
        return;
      }
      setGraph(data);
    } catch (e) {
      setGraphError((e as Error).message);
    } finally {
      setLoadingGraph(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedId) fetchGraph(selectedId);
  }, [selectedId, fetchGraph]);

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(s) ||
        (u.email ?? '').toLowerCase().includes(s) ||
        (u.mbti_type ?? '').toLowerCase().includes(s)
    );
  }, [users, search]);

  // ── D3 force graph (re-renders when theme changes too) ─────
  useEffect(() => {
    if (!d3Ready || !graph || !svgRef.current || !containerRef.current) return;
    const d3 = window.d3;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(480, rect.height);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const nodes = graph.nodes.map((n) => ({ ...n }));
    const links = graph.links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: GraphNode) => d.id)
          .distance((l: GraphLink) => (l.category === 'stage' ? 140 : 115))
          .strength(0.55)
      )
      .force('charge', d3.forceManyBody().strength(-360))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide().radius((d: GraphNode) => (d.size ?? 14) + 24)
      );

    // 计算每条链路的权重（同类节点数 → 决定线粗）
    const counts: Record<string, number> = {};
    for (const l of links) counts[l.category] = (counts[l.category] || 0) + 1;
    const maxCount = Math.max(1, ...Object.values(counts));
    const weightOf = (c: Category) => 1 + ((counts[c] || 1) / maxCount) * 2.4;

    // Links
    const link = svg
      .append('g')
      .attr('stroke-opacity', isDark ? 0.55 : 0.45)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: GraphLink) => palette[d.category].stroke)
      .attr('stroke-width', (d: GraphLink) => weightOf(d.category));

    // Node groups
    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'grab')
      .call(
        d3
          .drag()
          .on('start', (event: { active: boolean; subject: GraphNode }) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on('drag', (event: { subject: GraphNode; x: number; y: number }) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on('end', (event: { active: boolean; subject: GraphNode }) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          })
      );

    // 柔光晕（外圈）
    node
      .append('circle')
      .attr('class', 'glow')
      .attr('r', (d: GraphNode) => (d.size ?? 14) + (d.category === 'center' ? 14 : 8))
      .attr('fill', (d: GraphNode) => palette[d.category].glow)
      .attr('stroke', 'none');

    // 主圆
    const mainCircle = node
      .append('circle')
      .attr('class', 'main')
      .attr('r', (d: GraphNode) => d.size ?? 14)
      .attr('fill', (d: GraphNode) => palette[d.category].fill)
      .attr('stroke', (d: GraphNode) => palette[d.category].stroke)
      .attr('stroke-width', (d: GraphNode) => (d.category === 'center' ? 2 : 1.5))
      .attr('fill-opacity', 0.95);

    // 标签
    node
      .append('text')
      .text((d: GraphNode) => {
        const max = d.category === 'center' ? 10 : 8;
        return d.label.length > max ? d.label.slice(0, max) + '…' : d.label;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d: GraphNode) => (d.category === 'center' ? 13 : 11))
      .attr('font-weight', (d: GraphNode) => (d.category === 'center' ? 600 : 500))
      .attr('pointer-events', 'none')
      .attr('fill', (d: GraphNode) => palette[d.category].text);

    // hover 放大
    node
      .on('mouseenter', function (this: SVGGElement) {
        d3.select(this)
          .select('circle.main')
          .transition()
          .duration(180)
          .attr('r', (d: GraphNode) => (d.size ?? 14) * 1.18);
        d3.select(this)
          .select('circle.glow')
          .transition()
          .duration(180)
          .attr('r', (d: GraphNode) => (d.size ?? 14) * 1.18 + (d.category === 'center' ? 16 : 10));
      })
      .on('mouseleave', function (this: SVGGElement) {
        d3.select(this)
          .select('circle.main')
          .transition()
          .duration(180)
          .attr('r', (d: GraphNode) => d.size ?? 14);
        d3.select(this)
          .select('circle.glow')
          .transition()
          .duration(180)
          .attr('r', (d: GraphNode) => (d.size ?? 14) + (d.category === 'center' ? 14 : 8));
      });

    // 原生 title tooltip
    node.append('title').text((d: GraphNode) => {
      const cat = CATEGORY_LABEL[d.category];
      return d.detail ? `${cat} · ${d.detail}\n${d.label}` : `${cat}\n${d.label}`;
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: { source: GraphNode }) => d.source.x ?? 0)
        .attr('y1', (d: { source: GraphNode }) => d.source.y ?? 0)
        .attr('x2', (d: { target: GraphNode }) => d.target.x ?? 0)
        .attr('y2', (d: { target: GraphNode }) => d.target.y ?? 0);
      node.attr('transform', (d: GraphNode) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // suppress unused warning
    void mainCircle;

    return () => {
      simulation.stop();
    };
  }, [d3Ready, graph, palette, isDark]);

  const u = graph?.user;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">客户记忆图谱</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            把单个客户的 ola_user_memory 渲染成 D3 力导向关系图，结合个人速读小抄帮助理解客户画像
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <IconRefresh size={14} />
          刷新列表
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* 左：客户列表 */}
        <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col h-[calc(100vh-180px)] min-h-[480px]">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索姓名/邮箱/MBTI"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              共 {filteredUsers.length} 位有记忆数据的客户（按亲密度排序）
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingList && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">加载中…</div>
            )}
            {!loadingList && filteredUsers.length === 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">没有匹配的客户</div>
            )}
            {filteredUsers.map((cu) => {
              const active = cu.user_id === selectedId;
              return (
                <button
                  key={cu.user_id}
                  onClick={() => setSelectedId(cu.user_id)}
                  className={`w-full text-left px-3 py-2 mb-1 rounded-md transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 flex-shrink-0">
                      <IconUser size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {cu.display_name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {cu.mbti_type ? `${cu.mbti_type} · ` : ''}
                        {cu.total_conversations} 轮 · 亲密度 {cu.intimacy_score}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右：图谱 + playbook */}
        <div className="space-y-4">
          {/* 信息条 */}
          {u && (
            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center text-pink-700 dark:text-pink-200 font-semibold flex-shrink-0">
                {u.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.display_name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {u.email || '—'}
                </div>
              </div>
              <Stat label="MBTI" value={u.mbti_type || '—'} />
              <Stat label="阶段" value={u.sales_stage} />
              <Stat label="亲密度" value={String(u.intimacy_score)} />
              <Stat label="对话" value={`${u.total_conversations} 次 / ${u.total_turns} 轮`} />
            </div>
          )}

          {/* 图谱卡 */}
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {u?.display_name ? `${u.display_name} 的记忆图谱` : '请选择左侧客户'}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  节点可拖拽 · 悬停放大 · 连线粗细=该类记忆条数
                </p>
              </div>
              <Legend palette={palette} />
            </div>
            <div ref={containerRef} className="relative min-h-[480px]">
              {!selectedId && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                  从左侧选择一位客户查看记忆图谱
                </div>
              )}
              {loadingGraph && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 bg-white/60 dark:bg-[#1E293B]/60 z-10">
                  加载图谱中…
                </div>
              )}
              {graphError && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 dark:text-red-400">
                  {graphError}
                </div>
              )}
              {!d3Ready && selectedId && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                  加载 D3.js…
                </div>
              )}
              <svg ref={svgRef} className="block" />
            </div>
          </div>

          {/* Chat playbook 速读小抄 */}
          {graph && (
            <div className="bg-pink-50 dark:bg-pink-950/20 border-l-4 border-pink-400 dark:border-pink-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-pink-900 dark:text-pink-200">
                  📋 对话策略 · 速读小抄
                </h3>
                {graph.chat_playbook_updated_at && (
                  <span className="text-[10px] text-pink-600 dark:text-pink-400">
                    更新于 {new Date(graph.chat_playbook_updated_at).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>
              {graph.chat_playbook ? (
                <PlaybookText text={graph.chat_playbook} />
              ) : (
                <div className="text-[13px] text-gray-500 dark:text-gray-400">
                  尚未生成对话策略（每 5 轮对话异步 reflection 后自动生成）
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
    </div>
  );
}

function Legend({ palette }: { palette: Record<Category, Palette> }) {
  const items: Category[] = ['personality', 'interests', 'pain_points', 'conversion', 'stage'];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <div key={c} className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: palette[c].fill, border: `1px solid ${palette[c].stroke}` }}
          />
          {CATEGORY_LABEL[c]}
        </div>
      ))}
    </div>
  );
}

// 高亮关键词（费用/截止/MBTI/数字等），其余正文按主题色
function PlaybookText({ text }: { text: string }) {
  const KEYWORD_RE = /(费用|价格|奖学金|预算|deadline|截止|时间紧|拒信|焦虑|迷茫|家里|父母|MBTI|INFJ|INTJ|ENFP|ENTP|ISTJ|ISFJ|ESTJ|ESFJ|INFP|INTP|ENFJ|ENTJ|ISTP|ISFP|ESTP|ESFP|warmup|discovery|value_demo|guided|converting|暖场|挖掘|价值|引导|水到渠成|\d+)/gi;
  const parts = text.split(KEYWORD_RE);
  return (
    <div className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        KEYWORD_RE.test(p) ? (
          <span key={i} className="text-pink-700 dark:text-pink-300 font-medium">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </div>
  );
}
