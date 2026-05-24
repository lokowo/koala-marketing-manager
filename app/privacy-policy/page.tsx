import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Koala PhD',
  description: 'Koala PhD privacy policy — how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header>
          <a href="/" className="text-sm text-[#94A3B8] hover:text-[#F59E0B] transition">&larr; Back to Home</a>
          <h1 className="text-3xl font-bold text-white mt-4">Privacy Policy</h1>
          <h2 className="text-xl text-[#94A3B8] mt-1">隐私政策</h2>
          <p className="text-sm text-[#64748B] mt-3">Last updated / 最后更新: 2026-05-24</p>
        </header>

        <Section title="1. Introduction / 简介">
          <P>Koala PhD (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an AI-powered academic matching platform that helps students find PhD supervisors at Australian universities. This Privacy Policy explains how we collect, use, store, and protect your personal information.</P>
          <P>Koala PhD（&quot;我们&quot;）是一个 AI 驱动的学术匹配平台，帮助学生找到澳洲大学的博士导师。本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。</P>
        </Section>

        <Section title="2. Data We Collect / 我们收集的数据">
          <P>We collect the following categories of personal data:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li><strong className="text-white">Account information / 账户信息:</strong> Email address, display name, profile photo (via Google OAuth or email registration).</li>
            <li><strong className="text-white">Academic background / 学术背景:</strong> Education history, GPA, research experience, publications, and other academic credentials you provide.</li>
            <li><strong className="text-white">Research interests / 研究兴趣:</strong> Research topics, preferred fields of study, target universities, and supervisor preferences.</li>
            <li><strong className="text-white">Conversation data / 对话数据:</strong> Messages exchanged with our AI advisor for the purpose of providing personalised guidance.</li>
            <li><strong className="text-white">Usage data / 使用数据:</strong> Pages visited, features used, and interaction patterns to improve our service.</li>
          </ul>
        </Section>

        <Section title="3. Gmail Integration / Gmail 集成">
          <P>Our application integrates with Google Gmail under strict, limited scope:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li><strong className="text-white">Permission scope / 权限范围:</strong> We only request the <code className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[#F59E0B] text-xs">gmail.send</code> permission.</li>
            <li><strong className="text-white">User-initiated only / 仅用户触发:</strong> Emails are sent only when you explicitly confirm the content and recipient. We never send emails automatically or without your consent.</li>
            <li><strong className="text-white">No reading / 不读取邮件:</strong> We do not read, scan, index, or access any emails in your inbox.</li>
            <li><strong className="text-white">No modification / 不修改邮件:</strong> We do not modify, move, or delete any existing emails.</li>
            <li><strong className="text-white">No storage / 不存储邮件内容:</strong> We do not store the content of sent emails on our servers. Only metadata (send timestamp, recipient domain) is logged for delivery tracking.</li>
          </ul>
          <P>You may revoke Gmail access at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] hover:underline">Google Account settings</a>.</P>
          <P>您可以随时通过 Google 账户设置撤销 Gmail 授权。</P>
        </Section>

        <Section title="4. How We Use Your Data / 数据用途">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Providing personalised PhD supervisor matching / 提供个性化博士导师匹配</li>
            <li>Generating customised cold outreach emails / 生成定制套磁信</li>
            <li>Improving AI recommendations through anonymised analytics / 通过匿名分析改进 AI 推荐</li>
            <li>Sending service notifications (account, billing) / 发送服务通知</li>
            <li>Complying with legal obligations / 遵守法律义务</li>
          </ul>
          <P>We do not sell your personal data to third parties. 我们不会将您的个人数据出售给第三方。</P>
        </Section>

        <Section title="5. Data Storage & Security / 数据存储与安全">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li><strong className="text-white">Infrastructure / 基础设施:</strong> Data is stored in Supabase (PostgreSQL) hosted on AWS <code className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[#F59E0B] text-xs">ap-northeast-1</code> (Tokyo region).</li>
            <li><strong className="text-white">Row-Level Security / 行级安全:</strong> All database tables are protected by Supabase RLS policies, ensuring users can only access their own data.</li>
            <li><strong className="text-white">Encryption / 加密:</strong> Data is encrypted at rest (AES-256) and in transit (TLS 1.2+).</li>
            <li><strong className="text-white">Authentication / 认证:</strong> Managed by Supabase Auth with secure JWT tokens.</li>
          </ul>
        </Section>

        <Section title="6. Third-Party Services / 第三方服务">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li><strong className="text-white">Google OAuth:</strong> Authentication and <code className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[#F59E0B] text-xs">gmail.send</code> permission (see Section 3).</li>
            <li><strong className="text-white">Stripe:</strong> Payment processing. We do not store credit card numbers; all payment data is handled by Stripe in compliance with PCI DSS.</li>
            <li><strong className="text-white">Anthropic (Claude API):</strong> AI conversation processing. Conversations are sent to Anthropic for generating responses. See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] hover:underline">Anthropic&apos;s Privacy Policy</a>.</li>
            <li><strong className="text-white">Vercel:</strong> Application hosting and deployment.</li>
          </ul>
        </Section>

        <Section title="7. Data Retention & Deletion / 数据保留与删除">
          <P>You may request deletion of your account and all associated data at any time by contacting us. Upon receiving a deletion request, we will:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Delete your account and profile data within 30 days / 30 天内删除您的账户和个人资料</li>
            <li>Delete all conversation history / 删除所有对话记录</li>
            <li>Remove all academic data you provided / 删除您提供的所有学术资料</li>
            <li>Anonymise any analytics data / 匿名化所有分析数据</li>
          </ul>
          <P>您可以随时联系我们请求删除账户和所有相关数据。</P>
        </Section>

        <Section title="8. Your Rights / 您的权利">
          <P>You have the right to:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Access the personal data we hold about you / 访问我们持有的您的个人数据</li>
            <li>Request correction of inaccurate data / 请求更正不准确的数据</li>
            <li>Request deletion of your data / 请求删除您的数据</li>
            <li>Withdraw consent for data processing / 撤回数据处理同意</li>
            <li>Export your data in a portable format / 以可移植格式导出您的数据</li>
          </ul>
        </Section>

        <Section title="9. Children / 未成年人">
          <P>Koala PhD is designed for university-level students and researchers. We do not knowingly collect data from anyone under 16 years of age. If you believe a minor has provided us with personal data, please contact us immediately.</P>
          <P>Koala PhD 面向大学级别的学生和研究人员。我们不会有意收集 16 岁以下人士的数据。如果您认为未成年人向我们提供了个人数据，请立即联系我们。</P>
        </Section>

        <Section title="10. Changes to This Policy / 政策变更">
          <P>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the service after changes constitutes acceptance.</P>
          <P>我们可能会不时更新本隐私政策。重大变更将通过邮件或应用内通知告知您。变更后继续使用本服务即表示接受。</P>
        </Section>

        <Section title="11. Contact Us / 联系我们">
          <P>
            If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:<br />
            如果您对本隐私政策有疑问或希望行使数据权利，请联系我们：
          </P>
          <div className="rounded-xl bg-[#1E293B] border border-[#334155] p-4 text-sm space-y-1">
            <p className="text-white font-medium">Koala Study Advisors</p>
            <p className="text-[#CBD5E1]">Email: <a href="mailto:info@koalastudyadvisors.net" className="text-[#F59E0B] hover:underline">info@koalastudyadvisors.net</a></p>
            <p className="text-[#CBD5E1]">Suite 22/26A Lime St, Sydney NSW 2000, Australia</p>
          </div>
        </Section>

        <footer className="pt-6 border-t border-[#334155] flex items-center justify-between text-sm text-[#64748B]">
          <a href="/" className="hover:text-[#F59E0B] transition">&larr; Back to Home / 返回首页</a>
          <a href="/terms" className="hover:text-[#F59E0B] transition">Terms of Service / 服务条款 &rarr;</a>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-[#334155] pb-2">{title}</h3>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-[#CBD5E1]">{children}</p>;
}
