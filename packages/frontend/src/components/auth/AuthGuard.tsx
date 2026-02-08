'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

// 인증 없이 접근 가능한 페이지
const PUBLIC_PATHS = ['/login', '/terms', '/copyright'];

export function AuthGuard({ children }: AuthGuardProps) {
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
    console.log('AuthGuard - pathname:', pathname);
    console.log('AuthGuard - token:', token ? '있음' : '없음');
    
    if (!token) {
      console.log('AuthGuard - 토큰 없음, 로그인 페이지로 이동');
      router.push('/login');
      return;
    }

    // 토큰 유효성 검증 (간단한 만료 체크)
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      console.log('AuthGuard - 토큰 만료시간:', new Date(decoded.exp).toISOString());
      console.log('AuthGuard - 현재시간:', new Date().toISOString());
      
      if (decoded.exp && decoded.exp < Date.now()) {
        // 토큰 만료
        console.log('AuthGuard - 토큰 만료됨');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      console.log('AuthGuard - 인증 성공');
      setIsAuthenticated(true);
    } catch (err) {
      // 토큰 파싱 실패
      console.error('AuthGuard - 토큰 파싱 실패:', err);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [pathname, router]);

  // 로딩 중
  if (isAuthenticated === null && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return <>{children}</>;
}
