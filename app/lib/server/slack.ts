const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

async function post(blocks: SlackBlock[], text: string) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });
  } catch (e) {
    console.error('[slack] webhook failed:', e);
  }
}

function header(text: string): SlackBlock {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function section(text: string): SlackBlock {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function fields(pairs: [string, string][]): SlackBlock {
  return {
    type: 'section',
    fields: pairs.map(([label, value]) => ({ type: 'mrkdwn', text: `*${label}*\n${value}` })),
  };
}

function divider(): SlackBlock {
  return { type: 'divider' };
}

function context(text: string): SlackBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text }] };
}

export async function notifyNewSupportTicket(params: {
  userName: string;
  category: string;
  preview: string;
  threadId: string;
}) {
  await post(
    [
      header('🎫 新客服工单'),
      fields([
        ['用户', params.userName],
        ['类别', params.category],
      ]),
      section(params.preview.slice(0, 200)),
      context(`Thread ID: ${params.threadId}`),
    ],
    `新客服工单 — ${params.userName}: ${params.preview.slice(0, 80)}`,
  );
}

export async function notifySalesConversion(params: {
  salesName: string;
  customerName: string;
  fromStage: string;
  toStage: string;
}) {
  const emoji = params.toStage === 'converted' ? '🎉' : '📈';
  await post(
    [
      header(`${emoji} 客户阶段变更`),
      fields([
        ['销售', params.salesName],
        ['客户', params.customerName],
        ['变更', `${params.fromStage} → ${params.toStage}`],
      ]),
    ],
    `${params.salesName} 将 ${params.customerName} 从 ${params.fromStage} 更新到 ${params.toStage}`,
  );
}

export async function notifyRoleApplication(params: {
  userName: string;
  email: string;
  role: string;
}) {
  await post(
    [
      header('👤 新角色申请'),
      fields([
        ['用户', params.userName],
        ['邮箱', params.email],
        ['申请角色', params.role],
      ]),
    ],
    `新角色申请 — ${params.userName} 申请 ${params.role}`,
  );
}

export async function notifyNewUserSignup(params: {
  email: string;
  source?: string;
}) {
  await post(
    [
      header('🆕 新用户注册'),
      fields([
        ['邮箱', params.email],
        ['来源', params.source || '直接注册'],
      ]),
    ],
    `新用户注册: ${params.email}`,
  );
}

export async function notifyWeeklyReport(params: {
  weekStart: string;
  totalLeads: number;
  totalConversions: number;
  metCount: number;
  notMetCount: number;
  salesCount: number;
}) {
  await post(
    [
      header('📊 周报汇总'),
      fields([
        ['周期', params.weekStart],
        ['销售人数', `${params.salesCount}`],
        ['总注册', `${params.totalLeads}`],
        ['总转化', `${params.totalConversions}`],
      ]),
      divider(),
      section(`✅ 达标 ${params.metCount} 人 · ❌ 未达标 ${params.notMetCount} 人`),
    ],
    `周报 ${params.weekStart}: ${params.totalLeads} 注册, ${params.totalConversions} 转化, ${params.metCount}/${params.salesCount} 达标`,
  );
}

export async function notifyCustomAlert(title: string, message: string) {
  await post(
    [header(title), section(message)],
    `${title}: ${message}`,
  );
}
