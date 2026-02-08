'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

// 인증 없이 접근 가능한 페이지
const PUBLIC_PATHS = ['/login', '/register', '/terms', '/copyright'];

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 공개 페이지는 인증 체크 안 함
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsAuthenticated(true);
      return;
    }

    // 토큰 확인
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // 토큰 유효성 검증 (간단한 만료 체크)
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      
      if (decoded.exp && decoded.exp < Date.now()) {
        // 토큰 만료
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      setIsAuthenticated(true);
    } catch {
      // 토큰 파싱 실패
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [pathname, router]);

  // 로그인/회원가입 페이지는 레이아웃 없이 렌더링
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  // 로딩 중
  if (isAuthenticated === null && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
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
  );
}
