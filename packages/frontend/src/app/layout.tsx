import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 p-6 bg-gray-50">
                {children}
              </main>
              <footer className="bg-white border-t px-6 py-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>© 2024 RCIP - Robot Competitive Intelligence Portal</span>
                  <div className="flex gap-4">
                    <a href="/terms" className="hover:text-gray-700 hover:underline">이용약관</a>
                    <a href="/copyright" className="hover:text-gray-700 hover:underline">저작권 신고</a>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
