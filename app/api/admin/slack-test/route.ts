import { requireSuperAdmin } from '../../../lib/auth';
import { notifyCustomAlert } from '../../../lib/server/slack';

export async function POST() {
  try {
    await requireSuperAdmin();

    if (!process.env.SLACK_WEBHOOK_URL) {
      return Response.json({ error: 'SLACK_WEBHOOK_URL not configured' }, { status: 400 });
    }

    await notifyCustomAlert(
      '🧪 Slack 集成测试',
      'Koala PhD 后台 Slack 通知已成功连接！',
    );

    return Response.json({ success: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: msg }, { status: 500 });
  }
}
