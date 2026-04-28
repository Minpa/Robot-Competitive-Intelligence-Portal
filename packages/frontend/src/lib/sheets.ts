import type { RobotAIEvent, EventType } from '@/types/event-calendar';

const VALID_TYPES: EventType[] = ['전시', '학회', '정책'];

function parseRow(row: string[], index: number): RobotAIEvent | null {
  try {
    const [id, name, type, date_start, date_end, location, country, url, tagsRaw, scoreRaw] = row;

    if (!id || !name || !type || !date_start) {
      console.warn(`[sheets] row ${index + 2}: missing required fields, skipping`);
      return null;
    }

    if (!VALID_TYPES.includes(type as EventType)) {
      console.warn(`[sheets] row ${index + 2}: invalid type "${type}", skipping`);
      return null;
    }

    const score = Math.min(5, Math.max(1, parseInt(scoreRaw, 10) || 3));

    return {
      id: id.trim(),
      name: name.trim(),
      type: type.trim() as EventType,
      date_start: date_start.trim(),
      date_end: (date_end || date_start).trim(),
      location: (location || '').trim(),
      country: (country || '').trim(),
      url: (url || '').trim(),
      tags: tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      relevance_score: score as 1 | 2 | 3 | 4 | 5,
    };
  } catch (err) {
    console.warn(`[sheets] row ${index + 2}: parse error`, err);
    return null;
  }
}

export async function fetchEventsFromSheets(): Promise<RobotAIEvent[]> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) {
    throw new Error('GOOGLE_SHEETS_ID or GOOGLE_API_KEY not configured');
  }

  const range = encodeURIComponent('Sheet1!A2:J');
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values ?? [];

  const events: RobotAIEvent[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = parseRow(rows[i], i);
    if (parsed) events.push(parsed);
  }

  return events;
}
