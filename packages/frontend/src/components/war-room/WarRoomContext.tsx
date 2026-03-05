'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useWarRoomLgRobots } from '@/hooks/useWarRoom';
import type { LgRobotListItem } from '@/types/war-room';

interface WarRoomContextValue {
  selectedRobotId: string | null;
  setSelectedRobotId: (id: string) => void;
  lgRobots: LgRobotListItem[];
  isLoading: boolean;
}

const WarRoomContext = createContext<WarRoomContextValue | null>(null);

export function WarRoomProvider({ children }: { children: ReactNode }) {
  const { data: lgRobots, isLoading } = useWarRoomLgRobots();
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  // Default to CLOiD (first robot named CLOiD, or first robot in list)
  useEffect(() => {
    if (lgRobots && lgRobots.length > 0 && !selectedRobotId) {
      const cloid = lgRobots.find((r) => r.name.toLowerCase().includes('cloid'));
      setSelectedRobotId(cloid?.id ?? lgRobots[0].id);
    }
  }, [lgRobots, selectedRobotId]);

  return (
    <WarRoomContext.Provider
      value={{
        selectedRobotId,
        setSelectedRobotId,
        lgRobots: lgRobots ?? [],
        isLoading,
      }}
    >
      {children}
    </WarRoomContext.Provider>
  );
}

export function useWarRoomContext() {
  const ctx = useContext(WarRoomContext);
  if (!ctx) {
    throw new Error('useWarRoomContext must be used within a WarRoomProvider');
  }
  return ctx;
}
