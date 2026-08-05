import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'geolbgirpkzxrdvozmqw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    // 新闻类文章去重 · 第 2 步存量清理：被删/合并文章 slug → 同簇保留篇（301 永久重定向，保 SEO/入链）。
    // 公开博客 URL 形如 /koala/blog/{slug}（详情页优先按 slug 解析）。备份见 docs/removed-posts-20260805.json。
    const dedup301: { from: string; to: string }[] = [
      // 簇1 签证：2ca86d9a → 7850afae
      { from: 'interpretation-of-australias-latest-visa-policy-in-2026-essential-entry-regulati-1785645570964', to: 'australia-2026-latest-student-visa-policy-interpretation-five-key-changes-chines-1779689005169' },
      // 簇2 AI工具（保留 cae95b41）：9992522d / adc8988e / 009b372c → cae95b41
      { from: 'ai-tools-are-transforming-academic-research-how-australian-phd-students-leverage-1785645666156', to: 'ai-tools-are-reshaping-australias-academia-how-phd-students-can-truly-stand-out-1778283678165' },
      { from: 'ai-tools-transform-academic-research-how-australian-supervisors-view-chatgpt-and-1779413442905', to: 'ai-tools-are-reshaping-australias-academia-how-phd-students-can-truly-stand-out-1778283678165' },
      { from: 'ai-tools-are-reshaping-research-in-australian-universities-how-will-your-future-1778064392', to: 'ai-tools-are-reshaping-australias-academia-how-phd-students-can-truly-stand-out-1778283678165' },
      // 簇3 科研经费：a2add0c2 → ad1f561c
      { from: 'new-trends-in-australian-university-research-funding-which-fields-get-priority-i-1785645846779', to: 'new-trends-in-australian-higher-education-research-funding-which-research-fields-1779413355325' },
      // 簇5 OpenAI：13685d92 → 6ef2edea
      { from: 'how-openai-and-deepminds-latest-breakthroughs-are-reshaping-australias-ai-resear-1779247613965', to: 'openai-raises-4-billion-in-funding-ai-phd-research-opportunities-in-australia--1777989999' },
      // 簇6 奖学金：9dbcdba9 → 6f17e697
      { from: 'australian-university-scholarship-application-window-opening-soon-2026-h2-rtp-an-1785645755158', to: '2026-australian-university-scholarship-application-windows-summary-which-program-1779689104604' },
      // 簇4 生活成本：3d67ceea（执行前已从库移除，仍配置 301 保 SEO）→ bf3d4acf
      { from: 'from-sydney-to-melbourne-2026-latest-data-on-real-rental-and-living-costs-for-au-1785724731766', to: 'from-sydney-to-perth-a-real-cost-of-living-comparison-for-chinese-phd-students-a-1779689196281' },
    ];
    return dedup301.map(r => ({
      source: `/koala/blog/${r.from}`,
      destination: `/koala/blog/${r.to}`,
      statusCode: 301,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "img-src 'self' data: blob: https://api.qrserver.com https://geolbgirpkzxrdvozmqw.supabase.co",
              "media-src 'self' blob: https://geolbgirpkzxrdvozmqw.supabase.co",
              "connect-src 'self' https://geolbgirpkzxrdvozmqw.supabase.co wss://geolbgirpkzxrdvozmqw.supabase.co",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "assa-investment-group",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
