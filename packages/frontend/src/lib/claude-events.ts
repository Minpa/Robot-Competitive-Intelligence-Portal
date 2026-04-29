import Anthropic from '@anthropic-ai/sdk';
import type { RobotAIEvent, EventType } from '@/types/event-calendar';

const VALID_TYPES: EventType[] = ['전시', '학회', '세미나'];

function stripCitations(text: string): string {
  return text.replace(/<\/?cite[^>]*>/g, '').replace(/<\/?source[^>]*>/g, '').trim();
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const bracketStart = raw.indexOf('[');
  const bracketEnd = raw.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    return raw.slice(bracketStart, bracketEnd + 1);
  }
  return raw;
}

function validateEvent(obj: Record<string, unknown>, idx: number): RobotAIEvent | null {
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const type = typeof obj.type === 'string' ? obj.type.trim() : '';
  const dateStart = typeof obj.date_start === 'string' ? obj.date_start.trim() : '';

  if (!name || !dateStart) return null;
  if (!VALID_TYPES.includes(type as EventType)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart)) return null;

  const dateEnd = typeof obj.date_end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date_end.trim())
    ? obj.date_end.trim()
    : dateStart;

  const score = Math.min(5, Math.max(1, Number(obj.relevance_score) || 3));

  const tags = Array.isArray(obj.tags)
    ? (obj.tags as unknown[]).filter((t): t is string => typeof t === 'string').map(t => t.trim())
    : [];

  return {
    id: String(idx + 1),
    name: stripCitations(name),
    type: type as EventType,
    date_start: dateStart,
    date_end: dateEnd,
    location: stripCitations(typeof obj.location === 'string' ? obj.location : ''),
    country: stripCitations(typeof obj.country === 'string' ? obj.country : ''),
    url: typeof obj.url === 'string' ? obj.url.trim() : '',
    tags: tags.map(stripCitations),
    relevance_score: score as 1 | 2 | 3 | 4 | 5,
  };
}

export async function searchEventsWithClaude(): Promise<RobotAIEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      } as Anthropic.Messages.WebSearchTool20250305,
    ],
    system: `You are a robotics industry research analyst. Your job is to find REAL upcoming robot and AI related events by searching the web.

IMPORTANT RULES:
- Search multiple sources to find real, confirmed events
- Only include events with verified dates from official websites
- All dates must be YYYY-MM-DD format
- Event type must be exactly one of: 전시, 학회, 세미나
  - 전시: Trade shows, expos, exhibitions (CES, IFA, IREX, Hannover Messe, etc.)
  - 학회: Academic conferences, symposiums with paper presentations (ICRA, IROS, CoRL, RSS, etc.)
  - 세미나: Industry seminars, workshops, webinars, forums
- Country names in Korean (미국, 한국, 독일, 일본, 중국, 대만, 유럽(EU), etc.)
- Tags in Korean as an array of relevant keywords
- relevance_score 1-5 based on significance to the robotics industry
- Include the official website URL for each event
- Return ONLY a valid JSON array, no markdown fences, no explanation`,
    messages: [
      {
        role: 'user',
        content: `오늘 날짜는 ${today}입니다. 오늘부터 향후 18개월 이내에 예정된 로봇·AI 관련 글로벌 이벤트를 모두 찾아주세요.

검색 대상:
1. 주요 전시회: CES, IFA, MWC, Hannover Messe, IREX, CEATEC, 로보월드, Automate, COMPUTEX 등
2. 주요 학회: ICRA, IROS, CoRL, RSS, HRI, RoboCup, CVPR, NeurIPS 로봇 트랙 등
3. 주요 세미나/포럼: 로봇 안전, 협동로봇, 자율주행 로봇, 서비스로봇 관련 세미나

각 이벤트의 공식 홈페이지에서 정확한 날짜, 장소를 확인하세요.

JSON 배열로 반환하세요:
[{"name":"...","type":"전시|학회|세미나","date_start":"YYYY-MM-DD","date_end":"YYYY-MM-DD","location":"...","country":"한국","url":"https://...","tags":["태그1","태그2"],"relevance_score":5}]`,
      },
    ],
  });

  let rawText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      rawText += block.text;
    }
  }

  if (!rawText.trim()) {
    throw new Error('Claude returned empty response');
  }

  const cleaned = stripCitations(rawText);
  const jsonStr = extractJson(cleaned);
  const parsed: unknown[] = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error('Claude response is not a JSON array');
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const events: RobotAIEvent[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (typeof item !== 'object' || item === null) continue;
    const validated = validateEvent(item as Record<string, unknown>, i);
    if (!validated) continue;
    if (new Date(validated.date_end) < now) continue;
    events.push(validated);
  }

  events.sort((a, b) => a.date_start.localeCompare(b.date_start));

  return events;
}
