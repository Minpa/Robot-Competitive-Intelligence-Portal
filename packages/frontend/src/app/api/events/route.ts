import { NextResponse } from 'next/server';
import { fetchEventsFromSheets } from '@/lib/sheets';
import mockEvents from '@/data/mock-events.json';

export async function GET() {
  try {
    const events = await fetchEventsFromSheets();
    return NextResponse.json(events);
  } catch (err) {
    console.warn('[api/events] Sheets fetch failed, using mock fallback:', err);
    return NextResponse.json(mockEvents);
  }
}
