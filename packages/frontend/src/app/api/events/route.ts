import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsFromSheets } from '@/lib/sheets';
import mockEvents from '@/data/mock-events.json';
import type { RobotAIEvent } from '@/types/event-calendar';

// Resolve backend API base — same logic as packages/frontend/src/lib/api.ts.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BACKEND_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

/**
 * Fetch AI-discovered events from backend (Claude + web_search).
 * Returns [] on any failure — caller can fall back to other sources.
 */
async function fetchAIDiscoveredEvents(): Promise<RobotAIEvent[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/events/refresh`, {
      method: 'POST',
      cache: 'no-store',
      // The Claude call can take a while (web_search up to ~30s)
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.warn(`[api/events] backend AI refresh ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.events) ? (data.events as RobotAIEvent[]) : [];
  } catch (err) {
    console.warn('[api/events] AI refresh fetch failed:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

  // 1) Base events from Google Sheets (with mock fallback)
  let baseEvents: RobotAIEvent[] = [];
  try {
    baseEvents = await fetchEventsFromSheets(refresh);
  } catch (err) {
    console.warn('[api/events] Sheets fetch failed, using mock fallback:', err);
    baseEvents = mockEvents as RobotAIEvent[];
  }

  // 2) On manual refresh, additionally trigger AI discovery and merge.
  //    AI events go FIRST so the user sees fresh content at the top.
  let aiEvents: RobotAIEvent[] = [];
  if (refresh) {
    aiEvents = await fetchAIDiscoveredEvents();
  }

  // Dedupe by id, preferring AI-discovered (newer) over base.
  const seen = new Set<string>();
  const merged: RobotAIEvent[] = [];
  for (const e of [...aiEvents, ...baseEvents]) {
    if (!e?.id) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    merged.push(e);
  }

  return NextResponse.json(merged);
}
