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
    default: 'Koala PhD — AI-Powered Australian PhD Supervisor Matching',
    template: '%s | Koala PhD',
  },
  description: 'Find your ideal Australian PhD supervisor with AI-powered matching. Browse 38 universities, generate cold emails, and get free PhD application guidance.',
  keywords: ['Australian PhD', 'PhD supervisor', 'PhD application', '澳洲PhD', '博士申请', '导师推荐', '套磁信', 'scholarship Australia'],
  verification: {
    google: 'MNBTFnPgqdYoqogqXdHbKauY1flu9aA5YKvsDLb97bo',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: 'en_AU',
    siteName: 'Koala PhD',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Koala PhD — AI PhD Advisor' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
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
