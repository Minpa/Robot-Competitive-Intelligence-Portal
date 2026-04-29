import { NextRequest, NextResponse } from 'next/server';
import { searchEventsWithClaude } from '@/lib/claude-events';
import { readCache, writeCache, isCacheValid } from '@/lib/event-cache';
import mockEvents from '@/data/mock-events.json';

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

  if (refresh) {
    try {
      const events = await searchEventsWithClaude();
      writeCache(events);
      return NextResponse.json(events, {
        headers: { 'X-Data-Source': 'claude' },
      });
    } catch (err) {
      console.error('[api/events] Claude search failed:', err);
      const stale = readCache();
      if (stale) {
        return NextResponse.json(stale.events, {
          headers: { 'X-Data-Source': 'cache-stale' },
        });
      }
      return NextResponse.json(mockEvents, {
        headers: { 'X-Data-Source': 'mock' },
      });
    }
  }

  const cache = readCache();
  if (cache && isCacheValid(cache)) {
    return NextResponse.json(cache.events, {
      headers: { 'X-Data-Source': 'cache' },
    });
  }

  try {
    const events = await searchEventsWithClaude();
    writeCache(events);
    return NextResponse.json(events, {
      headers: { 'X-Data-Source': 'claude' },
    });
  } catch (err) {
    console.error('[api/events] Claude search failed:', err);
    if (cache) {
      return NextResponse.json(cache.events, {
        headers: { 'X-Data-Source': 'cache-stale' },
      });
    }
    return NextResponse.json(mockEvents, {
      headers: { 'X-Data-Source': 'mock' },
    });
  }
}
