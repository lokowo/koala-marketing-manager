import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const SEED_TEMPLATES = [
  {
    template_key: 'inactive_3d',
    subject_zh: '小欧打了个哈欠醒来发现你还没搜过教授...',
    subject_en: 'Ola woke up and noticed you haven\'t searched for professors yet...',
    body_zh: `<div style="font-family: 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">嗨，小欧在等你！</h2>
  <p style="color: #584838; line-height: 1.8;">你注册已经3天了，但还没有搜索过教授。</p>
  <p style="color: #584838; line-height: 1.8;">澳洲有超过5000位教授在招PhD学生，让小欧帮你找到最匹配的导师吧！</p>
  <a href="https://koalaphd.com/koala/professors" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">开始搜索教授 →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">如不想收到此类邮件，请<a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">点击退订</a></p>
</div>`,
    body_en: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">Hey, Ola is waiting for you!</h2>
  <p style="color: #584838; line-height: 1.8;">You signed up 3 days ago but haven't searched for any professors yet.</p>
  <p style="color: #584838; line-height: 1.8;">Over 5,000 Australian professors are looking for PhD students. Let Ola help you find the best match!</p>
  <a href="https://koalaphd.com/koala/professors" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Start Searching →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">Don't want these emails? <a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">Unsubscribe</a></p>
</div>`,
    trigger_condition: { type: 'inactive_days', days: 3, requires_no_sessions: true },
  },
  {
    template_key: 'letter_unsent_7d',
    subject_zh: '你给教授写的信还在草稿箱...',
    subject_en: 'Your professor email is still in drafts...',
    body_zh: `<div style="font-family: 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">套磁信还没发出去？</h2>
  <p style="color: #584838; line-height: 1.8;">你7天前生成了一封套磁信，但还没有后续动作。</p>
  <p style="color: #584838; line-height: 1.8;">教授的招生名额有限，早一天联系多一分机会！小欧可以帮你优化信件内容。</p>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">继续完善套磁信 →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">如不想收到此类邮件，请<a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">点击退订</a></p>
</div>`,
    body_en: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">Your cold email is still waiting!</h2>
  <p style="color: #584838; line-height: 1.8;">You generated a cold email 7 days ago but haven't taken any follow-up action.</p>
  <p style="color: #584838; line-height: 1.8;">Professor positions are limited — the earlier you reach out, the better your chances! Ola can help you refine the email.</p>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Continue Drafting →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">Don't want these emails? <a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">Unsubscribe</a></p>
</div>`,
    trigger_condition: { type: 'letter_unsent_days', days: 7 },
  },
  {
    template_key: 'deadline_30d',
    subject_zh: '申请截止还有30天',
    subject_en: 'Application deadline in 30 days',
    body_zh: `<div style="font-family: 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">申请截止倒计时：30天</h2>
  <p style="color: #584838; line-height: 1.8;">你目标大学的申请截止日期即将到来！</p>
  <p style="color: #584838; line-height: 1.8;"><strong>材料清单 Checklist：</strong></p>
  <ul style="color: #584838; line-height: 2;">
    <li>研究计划 Research Proposal</li>
    <li>推荐信 Reference Letters (2-3封)</li>
    <li>成绩单 Transcripts</li>
    <li>英语成绩 IELTS/TOEFL</li>
    <li>CV / Resume</li>
    <li>套磁信确认 Professor Contact</li>
  </ul>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">让小欧帮你检查 →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">如不想收到此类邮件，请<a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">点击退订</a></p>
</div>`,
    body_en: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">Application Deadline: 30 Days Away</h2>
  <p style="color: #584838; line-height: 1.8;">Your target university's application deadline is approaching!</p>
  <p style="color: #584838; line-height: 1.8;"><strong>Materials Checklist:</strong></p>
  <ul style="color: #584838; line-height: 2;">
    <li>Research Proposal</li>
    <li>Reference Letters (2-3)</li>
    <li>Transcripts</li>
    <li>IELTS/TOEFL Score</li>
    <li>CV / Resume</li>
    <li>Professor Contact Confirmation</li>
  </ul>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Let Ola Help You Check →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">Don't want these emails? <a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">Unsubscribe</a></p>
</div>`,
    trigger_condition: { type: 'deadline_approaching', days: 30 },
  },
  {
    template_key: 'deadline_7d',
    subject_zh: '⚠️ 申请截止仅剩7天！',
    subject_en: '⚠️ Only 7 days until application deadline!',
    body_zh: `<div style="font-family: 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #b06040;">⚠️ 紧急：申请截止仅剩7天！</h2>
  <p style="color: #584838; line-height: 1.8;">你目标大学的申请截止日期只剩7天了！</p>
  <p style="color: #584838; line-height: 1.8;"><strong>紧急行动清单：</strong></p>
  <ol style="color: #584838; line-height: 2;">
    <li>确认所有材料已上传</li>
    <li>确认推荐人已提交推荐信</li>
    <li>检查申请表填写完整</li>
    <li>确认付款/申请费</li>
    <li>提交前最后检查一遍</li>
  </ol>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #b06040; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">立即联系小欧 →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">如不想收到此类邮件，请<a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">点击退订</a></p>
</div>`,
    body_en: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #b06040;">⚠️ Urgent: Only 7 Days Left!</h2>
  <p style="color: #584838; line-height: 1.8;">Your target university's application deadline is only 7 days away!</p>
  <p style="color: #584838; line-height: 1.8;"><strong>Urgent Action List:</strong></p>
  <ol style="color: #584838; line-height: 2;">
    <li>Confirm all documents are uploaded</li>
    <li>Confirm referees have submitted letters</li>
    <li>Check application form is complete</li>
    <li>Confirm payment / application fee</li>
    <li>Final review before submission</li>
  </ol>
  <a href="https://koalaphd.com/koala/chat" style="display: inline-block; background: #b06040; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Contact Ola Now →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">Don't want these emails? <a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">Unsubscribe</a></p>
</div>`,
    trigger_condition: { type: 'deadline_approaching', days: 7 },
  },
  {
    template_key: 'dormant_30d',
    subject_zh: '好久不见！你的PhD申请进展如何？',
    subject_en: 'Long time no see! How\'s your PhD application going?',
    body_zh: `<div style="font-family: 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">小欧想你了！</h2>
  <p style="color: #584838; line-height: 1.8;">你已经30天没登录了，PhD申请进展得怎么样？</p>
  <p style="color: #584838; line-height: 1.8;">最近平台有一些新功能：</p>
  <ul style="color: #584838; line-height: 2;">
    <li>新增了更多教授数据</li>
    <li>套磁信模板优化</li>
    <li>智能匹配算法升级</li>
  </ul>
  <p style="color: #584838; line-height: 1.8;">回来看看吧，小欧随时准备帮你！</p>
  <a href="https://koalaphd.com/koala/home" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">回到 Koala PhD →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">如不想收到此类邮件，请<a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">点击退订</a></p>
</div>`,
    body_en: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <img src="https://koalaphd.com/images/ola/ola-welcome.svg" alt="Ola" width="80" style="margin-bottom: 16px;" />
  <h2 style="color: #1a2332;">Ola misses you!</h2>
  <p style="color: #584838; line-height: 1.8;">You haven't logged in for 30 days. How's your PhD application going?</p>
  <p style="color: #584838; line-height: 1.8;">Here's what's new on the platform:</p>
  <ul style="color: #584838; line-height: 2;">
    <li>More professor data added</li>
    <li>Improved cold email templates</li>
    <li>Upgraded matching algorithm</li>
  </ul>
  <p style="color: #584838; line-height: 1.8;">Come back and take a look — Ola is always ready to help!</p>
  <a href="https://koalaphd.com/koala/home" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Back to Koala PhD →</a>
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
  <p style="font-size: 12px; color: #907858;">Don't want these emails? <a href="https://koalaphd.com/koala/settings?unsubscribe=ola" style="color: #907858;">Unsubscribe</a></p>
</div>`,
    trigger_condition: { type: 'dormant_days', days: 30 },
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let inserted = 0;
    for (const template of SEED_TEMPLATES) {
      const { data: existing } = await db
        .from('ola_email_templates')
        .select('id')
        .eq('template_key', template.template_key)
        .maybeSingle();

      if (!existing) {
        await db.from('ola_email_templates').insert(template);
        inserted++;
      }
    }

    return Response.json({
      message: `Inserted ${inserted} templates (${SEED_TEMPLATES.length - inserted} already existed)`,
      inserted,
    });
  } catch (error) {
    console.error('[ola-email-templates seed]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
