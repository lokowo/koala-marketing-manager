import { Resend } from 'resend';

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@koalaphd.com';
const BRAND_NAME = 'Koala PhD';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';

function brandTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#faf6ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ec;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(125,99,64,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a2332 0%,#2a3a4f 100%);padding:28px 32px;text-align:center;">
          <div style="font-size:20px;margin-bottom:4px;">🐨</div>
          <div style="color:#c4a050;font-size:14px;font-weight:700;letter-spacing:0.5px;">${BRAND_NAME}</div>
        </td></tr>
        <!-- Title -->
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#1a2332;">${title}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:16px 32px 32px;font-size:14px;line-height:1.7;color:#584838;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f4ea;padding:20px 32px;text-align:center;border-top:1px solid #ebe3d0;">
          <div style="font-size:11px;color:#907858;line-height:1.6;">
            ${BRAND_NAME} · 澳洲 PhD 留学 AI 智能顾问平台<br/>
            Suite 22/26A Lime St, Sydney NSW 2000<br/>
            <a href="mailto:info@koalaphd.com" style="color:#c4a050;text-decoration:none;">info@koalaphd.com</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:20px 0;padding:16px 24px;background:#f2ead6;border-radius:12px;text-align:center;border:1px solid #e8dcc8;">
    <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1a2332;">${code}</span>
  </div>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="margin:24px 0;text-align:center;">
    <a href="${url}" style="display:inline-block;padding:12px 32px;background:#c4a050;color:#1a2332;font-weight:600;font-size:14px;text-decoration:none;border-radius:24px;">
      ${text}
    </a>
  </div>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  code: string;
  verifyUrl: string;
}) {
  const body = `
    <p>你好！感谢注册 ${BRAND_NAME}。</p>
    <p>请使用以下验证码完成邮箱验证：</p>
    ${codeBlock(params.code)}
    <p>或者点击下方按钮直接验证（48小时内有效）：</p>
    ${ctaButton('验证我的邮箱', params.verifyUrl)}
    <p style="font-size:12px;color:#907858;">如果你没有注册过 ${BRAND_NAME}，请忽略此邮件。</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `${BRAND_NAME} — 验证你的邮箱`,
    html: brandTemplate('验证你的邮箱', body),
  });
}

export async function sendVerificationReminder(params: {
  to: string;
  verifyUrl: string;
}) {
  const body = `
    <p>你好！你的 ${BRAND_NAME} 账户尚未完成邮箱验证。</p>
    <p>为了确保你能正常使用所有功能（包括 AI 导师匹配和申请信生成），请尽快完成验证：</p>
    ${ctaButton('立即验证邮箱', params.verifyUrl)}
    <p style="font-size:12px;color:#907858;">如果你已经验证，请忽略此邮件。</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `${BRAND_NAME} — 请完成邮箱验证`,
    html: brandTemplate('你的账户尚未验证', body),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  code: string;
  resetUrl: string;
}) {
  const body = `
    <p>你好！我们收到了你的密码重置请求。</p>
    <p>你的重置验证码为：</p>
    ${codeBlock(params.code)}
    <p>或者点击下方按钮直接重置密码（1小时内有效）：</p>
    ${ctaButton('重置密码', params.resetUrl)}
    <p style="font-size:12px;color:#907858;">如果你没有请求重置密码，请忽略此邮件并确保你的账户安全。</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `${BRAND_NAME} — 重置密码`,
    html: brandTemplate('重置你的密码', body),
  });
}

export async function sendWelcomeEmail(params: { to: string; name?: string }) {
  const greeting = params.name ? `${params.name}，欢迎加入！` : '欢迎加入！';
  const body = `
    <p>${greeting}</p>
    <p>你现在可以使用 ${BRAND_NAME} 的全部功能了：</p>
    <ul style="padding-left:20px;margin:16px 0;">
      <li style="margin-bottom:8px;"><strong>AI 导师匹配</strong> — 从 3,000+ 位澳洲教授中找到最适合你的导师</li>
      <li style="margin-bottom:8px;"><strong>定制申请信</strong> — AI 针对每位教授生成个性化邮件</li>
      <li style="margin-bottom:8px;"><strong>科研深潜</strong> — 搜索最新论文，理解前沿方向</li>
      <li style="margin-bottom:8px;"><strong>路径评估</strong> — 评估你的 PhD 申请竞争力</li>
    </ul>
    ${ctaButton('开始使用', `${BASE_URL}/koala/home`)}
    <p style="font-size:12px;color:#907858;">有任何问题，随时联系我们的团队。祝你申请顺利！</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `欢迎加入 ${BRAND_NAME} 🐨`,
    html: brandTemplate('欢迎加入 Koala 大家庭', body),
  });
}

export async function sendSurveyThankYouEmail(params: {
  to: string;
  name?: string;
  responseId: string;
}): Promise<{ emailId?: string }> {
  const greeting = params.name ? `${params.name}，你好！` : '你好！';
  const body = `
    <p>${greeting}</p>
    <p>感谢你完成我们的调研问卷！你的反馈对我们非常重要。</p>
    <p>${BRAND_NAME} 是一个 AI 驱动的澳洲 PhD 导师匹配平台，帮助中国留学生：</p>
    <ul style="padding-left:20px;margin:16px 0;">
      <li style="margin-bottom:8px;"><strong>智能匹配</strong> — 从数千位澳洲教授中找到最适合你的导师</li>
      <li style="margin-bottom:8px;"><strong>定制套磁信</strong> — AI 针对每位教授生成个性化邮件</li>
      <li style="margin-bottom:8px;"><strong>科研指导</strong> — 搜索论文、理解研究方向</li>
    </ul>
    ${ctaButton('免费注册，开始匹配', `${BASE_URL}/koala/home`)}
    <p style="font-size:12px;color:#907858;">这封邮件由 ${BRAND_NAME} 自动发送，如有疑问请联系 info@koalaphd.com</p>
  `;

  try {
    const result = await getResend().emails.send({
      from: `${BRAND_NAME} <hello@koalaphd.com>`,
      to: params.to,
      subject: `🐨 感谢参与问卷！来认识你的 PhD 导师吧`,
      html: brandTemplate('感谢参与问卷', body),
      headers: {
        'X-Entity-Ref-ID': params.responseId,
      },
      tags: [
        { name: 'survey_response_id', value: params.responseId },
      ],
    });
    return { emailId: result.data?.id };
  } catch (e) {
    console.error('[sendSurveyThankYouEmail]', e);
    return {};
  }
}

export async function sendSecurityWarning(params: {
  to: string;
  verifyUrl: string;
}) {
  const body = `
    <p>你好！你在 ${BRAND_NAME} 注册已超过 7 天，但邮箱仍未验证。</p>
    <p style="color:#b06040;font-weight:600;">为了保护平台安全，未验证的账户可能在 30 天后被自动清理。</p>
    <p>如果你仍需要使用此账户，请尽快完成验证：</p>
    ${ctaButton('立即验证', params.verifyUrl)}
    <p style="font-size:12px;color:#907858;">如果你不再需要此账户，无需任何操作。</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `${BRAND_NAME} — 账户安全提醒`,
    html: brandTemplate('账户安全提醒', body),
  });
}

export async function sendProfessorVerificationEmail(params: {
  to: string;
  code: string;
  professorName: string;
}) {
  const body = `
    <p>Dear Professor ${params.professorName},</p>
    <p>We have received a request to verify your profile on ${BRAND_NAME}, an AI-powered platform that connects prospective PhD students with Australian supervisors.</p>
    <p>Your verification code is:</p>
    ${codeBlock(params.code)}
    <p>This code expires in 10 minutes. Once verified, you will be able to:</p>
    <ul style="padding-left:20px;margin:16px 0;">
      <li style="margin-bottom:8px;">Manage your public profile and research interests</li>
      <li style="margin-bottom:8px;">Post a message visible to prospective students</li>
      <li style="margin-bottom:8px;">See analytics on student interest</li>
    </ul>
    <p style="font-size:12px;color:#907858;">If you did not request this verification, please ignore this email.</p>
  `;

  return getResend().emails.send({
    from: `${BRAND_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: `${BRAND_NAME} — Verify Your Professor Profile`,
    html: brandTemplate('Professor Verification', body),
  });
}
