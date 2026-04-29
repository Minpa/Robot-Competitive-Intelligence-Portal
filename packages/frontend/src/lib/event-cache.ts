import fs from 'fs';
import path from 'path';
import type { RobotAIEvent } from '@/types/event-calendar';

interface EventCache {
  updatedAt: string;
  events: RobotAIEvent[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCachePath(): string {
  const dataDir = path.join(process.cwd(), 'src/data');
  if (fs.existsSync(dataDir)) return path.join(dataDir, 'cached-events.json');
  return path.join('/tmp', 'cached-events.json');
}

export function readCache(): EventCache | null {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf-8');
    return JSON.parse(raw) as EventCache;
  } catch {
    return null;
  }
}

export function writeCache(events: RobotAIEvent[]): void {
  const cache: EventCache = { updatedAt: new Date().toISOString(), events };
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[event-cache] write failed:', err);
  }
}

export function isCacheValid(cache: EventCache): boolean {
  const age = Date.now() - new Date(cache.updatedAt).getTime();
  return age < CACHE_TTL_MS;
}
