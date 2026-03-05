'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { WarRoomProvider } from '@/components/war-room/WarRoomContext';
import { WarRoomLayout } from '@/components/war-room/WarRoomLayout';

export default function WarRoomRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
  });

  useEffect(() => {
    if (!isLoading && user?.role === 'viewer') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  if (user?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">접근 권한이 없습니다</p>
          <p className="text-slate-500 text-xs">대시보드로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <WarRoomProvider>
      <WarRoomLayout>{children}</WarRoomLayout>
    </WarRoomProvider>
  );
}
