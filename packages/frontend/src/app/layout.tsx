import type { Metadata } from 'next';
import { IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { MainLayout } from '@/components/layout/MainLayout';

const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RCIP - Robot Competitive Intelligence Portal',
  description: '로봇 경쟁사 인텔리전스 포털',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${plexSerif.variable} ${plexMono.variable}`}>
      <head>
        {/* Pretendard (본문 폰트) — Google Fonts 미제공으로 CDN 로드 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans">
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
