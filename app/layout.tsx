import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./components/LanguageContext";
import { ThemeProvider } from "./lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://koalaphd.com'),
  title: {
    default: 'Koala PhD | 澳洲PhD申请AI平台 — 导师匹配·套磁信·奖学金',
    template: '%s | Koala PhD',
  },
  description: '澳洲PhD申请AI平台。覆盖全澳38所大学教授数据库，AI智能导师匹配，一键生成套磁信。免费PhD路径评估、科研方向深潜、奖学金信息。Find your ideal Australian PhD supervisor with AI-powered matching.',
  keywords: ['澳洲PhD', 'PhD申请', '澳洲博士', '教授匹配', 'AI申请', '套磁信', '导师推荐', 'PhD supervisor', 'Australian PhD', 'scholarship Australia'],
  alternates: {
    canonical: 'https://koalaphd.com',
  },
  verification: {
    google: 'MNBTFnPgqdYoqogqXdHbKauY1flu9aA5YKvsDLb97bo',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: 'en_AU',
    siteName: 'Koala PhD',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Koala PhD — 澳洲PhD申请AI平台' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koala PhD | 澳洲PhD申请AI平台',
    description: '覆盖全澳38所大学教授，AI导师匹配，一键生成套磁信。',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
