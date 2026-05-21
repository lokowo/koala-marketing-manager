'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface WorkLog {
  id: string;
  admin_id: string;
  action: string;
  action_category: string | null;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_profiles?: { display_name: string; email: string; avatar_url: string | null };
}

const ACTION_LABELS: Record<string, string> = {
  // Admin / Content
  blog_generate: '生成博客',
  blog_generate_professor: '生成教授文章',
  blog_create: '创建文章',
  blog_update: '编辑文章',
  blog_publish: '发布文章',
  blog_delete: '删除文章',
  blog_pin: '置顶文章',
  blog_unpin: '取消置顶',
  professor_create: '创建教授',
  professor_update: '编辑教授',
  professor_delete: '删除教授',
  // User management
  user_role_change: '修改角色',
  user_delete: '删除用户',
  user_batch_delete: '批量删除',
  user_view: '查看用户',
  role_application_approve: '审批角色申请',
  role_application_reject: '拒绝角色申请',
  // Sales
  customer_update: '客户跟进',
  create_qrcode: '生成推广码',
  customer_registered: '客户注册',
  view_customer: '查看客户',
  generate_email_for_customer: '帮客户生成套磁信',
  add_customer_note: '客户备注',
  share_qrcode: '分享二维码',
  contact_log_add: '添加沟通记录',
  // System / User actions
  user_register: '新用户注册',
  role_application_submit: '提交角色申请',
  outreach_generate: '生成套磁信',
  outreach_send: '发送套磁信',
  ai_chat: 'AI 对话',
  professor_search: '搜索教授',
  // Admin user actions
  user_add_note: '添加用户备注',
  user_update: '更新用户资料',
  user_delete_request: '申请删除用户',
  customer_contact: '客户沟通',
};

const ADMIN_CATEGORIES = [
  { value: 'blog_management', label: '文章管理' },
  { value: 'professor_management', label: '教授管理' },
  { value: 'user_management', label: '用户管理' },
  { value: 'admin_general', label: '其他管理' },
];

const SALES_CATEGORIES = [
  { value: 'sales_customer', label: '客户管理' },
  { value: 'sales_outreach', label: '套磁信' },
  { value: 'sales_communication', label: '客户沟通' },
  { value: 'sales_marketing', label: '营销推广' },
];

const SYSTEM_CATEGORIES = [
  { value: 'system_registration', label: '用户注册' },
  { value: 'system_usage', label: '平台使用' },
];

export default function WorkLogsPage() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [total, setTotal] = useState(0);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterAdmin, setFilterAdmin] = useState(searchParams.get('userId') || '');
  const [filterRole, setFilterRole] = useState(searchParams.get('role') || '');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (search) params.set('search', search);
    if (filterAction) params.set('action', filterAction);
    if (filterAdmin) params.set('userId', filterAdmin);
    if (filterRole) params.set('role', filterRole);
    if (filterCategory) params.set('category', filterCategory);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await fetch(`/api/admin/work-logs?${params}`);
    const d = await res.json();
    setLogs(d.data ?? []);
    setTotal(d.total ?? 0);
    if (d.admins) setAdmins(prev => ({ ...prev, ...d.admins }));
    setLoading(false);
  }, [page, search, filterAction, filterAdmin, filterRole, filterCategory, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => { setPage(1); }, [search, filterAction, filterAdmin, filterRole, filterCategory, dateFrom, dateTo]);

  function clearFilters() {
    setSearch(''); setFilterAction(''); setFilterAdmin('');
    setFilterRole(''); setFilterCategory(''); setDateFrom(''); setDateTo('');
  }

  const totalPages = Math.ceil(total / 30);
  const adminList = Object.entries(admins);
  const hasFilters = search || filterAction || filterAdmin || filterRole || filterCategory || dateFrom || dateTo;

  const categoryOptions = filterRole === 'admin' ? ADMIN_CATEGORIES
    : filterRole === 'sales' ? SALES_CATEGORIES
    : filterRole === 'system' ? SYSTEM_CATEGORIES
    : [...ADMIN_CATEGORIES, ...SALES_CATEGORIES, ...SYSTEM_CATEGORIES];

  return (
    <div>
      <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100 mb-4">工作日志</h1>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 搜索：如「删除 Jones」「王五 客户」「注册」"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-amber-300"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setFilterCategory(''); }}
            className="rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
          >
            <option value="">全部角色</option>
            <option value="admin">Admin</option>
            <option value="sales">Sales</option>
            <option value="system">System</option>
          </select>
          <select
            value={filterAdmin}
            onChange={e => setFilterAdmin(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
          >
            <option value="">全部人员</option>
            {adminList.map(([uid, name]) => (
              <option key={uid} value={uid}>{name}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
          >
            <option value="">全部分类</option>
            {categoryOptions.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
            title="开始日期"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
            title="结束日期"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              重置
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{total} 条记录</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">暂无匹配的日志</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2.5 font-medium w-[130px]">时间</th>
                  <th className="text-left px-4 py-2.5 font-medium w-[60px]">角色</th>
                  <th className="text-left px-4 py-2.5 font-medium">人员</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                  <th className="text-left px-4 py-2.5 font-medium">目标</th>
                  <th className="text-center px-4 py-2.5 font-medium w-[60px]">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map(log => {
                  const logRole = (log.details as Record<string, unknown>)?.role as string || 'admin';
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            logRole === 'sales' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {logRole === 'sales' ? 'Sales' : 'Admin'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/dashboard/koala/work-logs/${log.admin_id}?role=${logRole}`}
                            className="text-gray-700 dark:text-gray-300 hover:text-amber-500 no-underline font-medium"
                            onClick={e => e.stopPropagation()}
                          >
                            {log.user_profiles?.display_name || log.user_profiles?.email || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px]">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                          {log.target_name || log.target_type}
                          {log.target_id && !log.target_name ? ` #${log.target_id.slice(0, 8)}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block transition-transform ${expandedId === log.id ? 'rotate-90' : ''}`}>▶</span>
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                            <div className="text-xs space-y-1.5">
                              <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">操作人 ID:</span> <span className="text-gray-600 dark:text-gray-400 font-mono text-[10px]">{log.admin_id}</span></div>
                              <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">角色:</span> <span className="text-gray-600 dark:text-gray-400">{logRole}</span></div>
                              <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">目标类型:</span> <span className="text-gray-600 dark:text-gray-400">{log.target_type}</span></div>
                              {log.target_id && <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">目标 ID:</span> <span className="text-gray-600 dark:text-gray-400 font-mono text-[10px]">{log.target_id}</span></div>}
                              {log.target_name && <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">目标名称:</span> <span className="text-gray-600 dark:text-gray-400">{log.target_name}</span></div>}
                              <div><span className="text-gray-400 dark:text-gray-500 w-16 inline-block">完整时间:</span> <span className="text-gray-600 dark:text-gray-400">{new Date(log.created_at).toLocaleString('zh-CN')}</span></div>
                              {log.details && (
                                <div>
                                  <span className="text-gray-400 dark:text-gray-500">详情:</span>
                                  <pre className="mt-1 p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-400 overflow-auto max-h-[200px] whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50">上一页</button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
