import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Koala PhD',
  description: 'Koala PhD terms of service — rules and guidelines for using our AI PhD supervisor matching platform. 服务条款。',
  alternates: { canonical: 'https://koalaphd.com/terms' },
  openGraph: {
    title: 'Terms of Service | Koala PhD',
    description: 'Terms of service for Koala PhD platform.',
    url: 'https://koalaphd.com/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header>
          <a href="/" className="text-sm text-[#94A3B8] hover:text-[#F59E0B] transition">&larr; Back to Home</a>
          <h1 className="text-3xl font-bold text-white mt-4">Terms of Service</h1>
          <h2 className="text-xl text-[#94A3B8] mt-1">服务条款</h2>
          <p className="text-sm text-[#64748B] mt-3">Last updated / 最后更新: 2026-05-24</p>
        </header>

        <Section title="1. Acceptance of Terms / 接受条款">
          <P>By accessing or using Koala PhD (&quot;the Service&quot;), operated by Koala Study Advisors (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</P>
          <P>使用 Koala PhD（&quot;本服务&quot;）即表示您同意受本服务条款的约束。如果您不同意，请勿使用本服务。</P>
        </Section>

        <Section title="2. Description of Service / 服务描述">
          <P>Koala PhD is an AI-powered educational assistance tool that:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Matches students with potential PhD supervisors at Australian universities / 将学生与澳洲大学的潜在博士导师匹配</li>
            <li>Generates personalised cold outreach emails / 生成个性化套磁信</li>
            <li>Provides AI-powered academic guidance / 提供 AI 驱动的学术指导</li>
            <li>Offers research interest analysis and professor recommendations / 提供研究兴趣分析和教授推荐</li>
          </ul>
          <div className="rounded-xl bg-[#1E293B] border border-[#F59E0B]/30 p-4 mt-4">
            <p className="text-sm text-[#F59E0B] font-medium">Important Notice / 重要声明</p>
            <P>Koala PhD is an educational assistance tool, not a recruitment or admissions agency. We do not guarantee admission to any university or program. All information and recommendations are advisory in nature. We are not a licensed migration agent and do not provide migration advice.</P>
            <P>Koala PhD 是教育辅助工具，不是招生或留学中介机构。我们不保证任何大学或项目的录取。所有信息和推荐均为建议性质。我们不是持牌移民代理，不提供移民建议。</P>
          </div>
        </Section>

        <Section title="3. User Accounts / 用户账户">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>You must provide accurate and complete registration information / 您必须提供准确和完整的注册信息</li>
            <li>You are responsible for maintaining the security of your account credentials / 您有责任维护账户凭据的安全</li>
            <li>You must be at least 16 years old to create an account / 您必须年满 16 岁才能创建账户</li>
            <li>One account per person; shared or automated accounts are not permitted / 每人一个账户，不允许共享或自动化账户</li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use / 可接受的使用">
          <P>You agree not to:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Use the Service for any unlawful purpose / 将服务用于任何非法目的</li>
            <li>Submit false or misleading academic information / 提交虚假或误导性学术信息</li>
            <li>Send unsolicited bulk emails through our Gmail integration / 通过我们的 Gmail 集成发送未经请求的批量邮件</li>
            <li>Attempt to reverse-engineer, scrape, or extract data from the Service / 试图逆向工程、爬取或提取服务中的数据</li>
            <li>Harass, impersonate, or misrepresent yourself to professors or universities / 骚扰、冒充或向教授或大学虚假陈述自己</li>
            <li>Circumvent rate limits, access controls, or security measures / 绕过速率限制、访问控制或安全措施</li>
            <li>Use AI-generated content in a way that violates academic integrity policies / 以违反学术诚信政策的方式使用 AI 生成的内容</li>
          </ul>
        </Section>

        <Section title="5. Paid Services & Credits / 付费服务与积分">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>Certain features (e.g., cold email generation) require credits or a subscription / 某些功能（如套磁信生成）需要积分或订阅</li>
            <li>Payments are processed securely via Stripe / 付款通过 Stripe 安全处理</li>
            <li>Credits are non-transferable and non-refundable unless required by law / 积分不可转让且不可退款（法律要求除外）</li>
            <li>We reserve the right to modify pricing with 30 days&apos; notice / 我们保留在提前 30 天通知后修改价格的权利</li>
            <li>Free tier features may change without prior notice / 免费功能可能不经事先通知而更改</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property / 知识产权">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li><strong className="text-white">Our content / 我们的内容:</strong> The Service, its design, code, and branding are owned by Koala Study Advisors. You may not copy or redistribute them.</li>
            <li><strong className="text-white">Your content / 您的内容:</strong> You retain ownership of the academic information and materials you upload. You grant us a limited licence to process this data for providing the Service.</li>
            <li><strong className="text-white">AI-generated content / AI 生成内容:</strong> Emails and recommendations generated by our AI are provided for your personal use. You are responsible for reviewing and editing them before sending.</li>
            <li><strong className="text-white">Professor data / 教授数据:</strong> Professor information is aggregated from publicly available academic sources and attributed accordingly.</li>
          </ul>
        </Section>

        <Section title="7. Gmail Integration / Gmail 集成">
          <P>When you connect your Google account and grant <code className="px-1.5 py-0.5 rounded bg-[#1E293B] text-[#F59E0B] text-xs">gmail.send</code> permission:</P>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>You authorise us to send emails on your behalf only when you explicitly confirm / 您授权我们仅在您明确确认后代您发送邮件</li>
            <li>You are responsible for the content of emails you choose to send / 您对选择发送的邮件内容负责</li>
            <li>You may revoke access at any time via Google Account settings / 您可以随时通过 Google 账户设置撤销访问权限</li>
            <li>See our <a href="/privacy-policy" className="text-[#F59E0B] hover:underline">Privacy Policy</a> for full details on data handling / 请参阅我们的隐私政策了解数据处理的完整细节</li>
          </ul>
        </Section>

        <Section title="8. Disclaimers / 免责声明">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>The Service is provided &quot;as is&quot; without warranties of any kind / 服务按&quot;现状&quot;提供，不作任何形式的保证</li>
            <li>We do not guarantee the accuracy, completeness, or timeliness of professor data / 我们不保证教授数据的准确性、完整性或时效性</li>
            <li>AI recommendations are advisory and should not be the sole basis for academic decisions / AI 推荐仅供参考，不应作为学术决策的唯一依据</li>
            <li>We are not responsible for the outcome of any communication with professors / 我们不对与教授的任何沟通结果负责</li>
            <li>Professor availability, funding status, and acceptance criteria may change without notice / 教授的空缺、资助状态和录取标准可能随时变化</li>
          </ul>
        </Section>

        <Section title="9. Limitation of Liability / 责任限制">
          <P>To the maximum extent permitted by law, Koala Study Advisors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of academic opportunities, arising from your use of the Service.</P>
          <P>Our total liability for any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.</P>
          <P>在法律允许的最大范围内，Koala Study Advisors 不对因使用本服务而产生的任何间接、附带、特殊、后果性或惩罚性损害承担责任，包括学术机会的损失。我们对任何索赔的总责任不超过您在索赔前 12 个月内向我们支付的金额。</P>
        </Section>

        <Section title="10. Termination / 终止">
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-[#CBD5E1]">
            <li>You may terminate your account at any time by contacting us / 您可以随时联系我们终止账户</li>
            <li>We may suspend or terminate accounts that violate these Terms / 我们可以暂停或终止违反本条款的账户</li>
            <li>Upon termination, your right to use the Service ceases immediately / 终止后，您使用服务的权利立即终止</li>
            <li>Data deletion follows the process described in our <a href="/privacy-policy" className="text-[#F59E0B] hover:underline">Privacy Policy</a> / 数据删除遵循隐私政策中描述的流程</li>
          </ul>
        </Section>

        <Section title="11. Governing Law / 适用法律">
          <P>These Terms are governed by the laws of New South Wales, Australia. Any disputes shall be resolved in the courts of New South Wales.</P>
          <P>本条款受澳大利亚新南威尔士州法律管辖。任何争议应在新南威尔士州法院解决。</P>
        </Section>

        <Section title="12. Changes to Terms / 条款变更">
          <P>We may update these Terms from time to time. Material changes will be communicated via email or in-app notification at least 30 days before they take effect. Continued use after the effective date constitutes acceptance.</P>
          <P>我们可能会不时更新本条款。重大变更将在生效前至少 30 天通过邮件或应用内通知告知。生效日后继续使用即表示接受。</P>
        </Section>

        <Section title="13. Contact Us / 联系我们">
          <P>For questions about these Terms of Service:</P>
          <div className="rounded-xl bg-[#1E293B] border border-[#334155] p-4 text-sm space-y-1">
            <p className="text-white font-medium">Koala Study Advisors</p>
            <p className="text-[#CBD5E1]">Email: <a href="mailto:info@koalastudyadvisors.net" className="text-[#F59E0B] hover:underline">info@koalastudyadvisors.net</a></p>
          </div>
        </Section>

        <footer className="pt-6 border-t border-[#334155] flex items-center justify-between text-sm text-[#64748B]">
          <a href="/" className="hover:text-[#F59E0B] transition">&larr; Back to Home / 返回首页</a>
          <a href="/privacy-policy" className="hover:text-[#F59E0B] transition">Privacy Policy / 隐私政策 &rarr;</a>
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
