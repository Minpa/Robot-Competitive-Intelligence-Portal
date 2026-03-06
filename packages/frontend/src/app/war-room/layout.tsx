'use client';

import { WarRoomProvider } from '@/components/war-room/WarRoomContext';
import { WarRoomLayout } from '@/components/war-room/WarRoomLayout';

export default function WarRoomRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WarRoomProvider>
      <WarRoomLayout>{children}</WarRoomLayout>
    </WarRoomProvider>
  );
}
