/**
 * EventVideoPptService — 이벤트 특집 페이지(예: WRC 2026) 영상 리스트를 PPT로 다운로드
 *
 * 페이지에 표시되는 카테고리별 영상 목록(썸네일·제목·채널·브리프·URL)을 그대로
 * pptxgenjs 슬라이드로 옮긴다. 썸네일은 서버측에서 fetch해 base64 data URI로 임베드한다.
 */

import PptxGenJS from 'pptxgenjs';
import { eventVideoBriefService, getEventConfig } from './event-video-brief.service.js';

const TASK_TYPE_ORDER = [
  '보행/이동',
  '파지/조작',
  '전신 작업',
  '공장/산업 작업',
  '가사/서비스',
  '상호작용/데모쇼',
  '제품 공개',
  '기타',
  '미분류',
];

const MAX_THUMBNAILS = 60;
const THUMBNAIL_TIMEOUT_MS = 5000;
// 한 장을 좌/우 2단으로 나눠 단마다 3개 — 총 6개/슬라이드
const VIDEOS_PER_SLIDE = 6;
const ROWS_PER_COLUMN = 3;
const ROW_HEIGHT = 2.05;
const CONTENT_START_Y = 0.95;
const COLUMN_X = [0.35, 6.85]; // 좌/우 단 시작 x
const CELL_WIDTH = 6.1;

const BG = 'FFFFFF';
const TITLE_COLOR = '1E293B';
const TEXT_COLOR = '334155';
const SUBTLE_COLOR = '64748B';
const ACCENT_COLOR = '7C3AED';

type EventVideo = Awaited<ReturnType<typeof eventVideoBriefService.listEventVideos>>[number];
type EventTrendSummary = Awaited<ReturnType<typeof eventVideoBriefService.getTrendSummary>>;

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function extractVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([\w-]{11})/);
  return m?.[1] ?? null;
}

async function fetchThumbnailDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), THUMBNAIL_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function briefLines(brief: NonNullable<EventVideo['brief']>): string[] {
  const lines: string[] = [];
  if (brief.mainProducts.length > 0) {
    lines.push(`주요 제품: ${brief.mainProducts[0]}`.slice(0, 90));
  }
  if (brief.demoContents.length > 0) {
    lines.push(`시연: ${brief.demoContents[0]}`.slice(0, 90));
  }
  if (brief.insights.length > 0) {
    lines.push(`시사점: ${brief.insights[0]}`.slice(0, 90));
  }
  return lines.slice(0, 3);
}

class EventVideoPptService {
  /** 이벤트 영상 리스트(카테고리별 + 브리프)를 PPT 버퍼로 생성. 존재하지 않는 이벤트면 null */
  async generate(eventKey: string): Promise<Buffer | null> {
    const event = getEventConfig(eventKey);
    if (!event) return null;

    const videos = await eventVideoBriefService.listEventVideos(eventKey).catch(() => [] as EventVideo[]);
    const trend = await eventVideoBriefService.getTrendSummary(eventKey).catch(() => null as EventTrendSummary);

    // 썸네일 서버측 임베드 (최대 60건)
    const thumbMap = new Map<string, string>();
    const toEmbed = videos.slice(0, MAX_THUMBNAILS).filter((v) => !!v.thumbnail);
    await Promise.all(
      toEmbed.map(async (v) => {
        const data = await fetchThumbnailDataUri(v.thumbnail as string);
        if (data) thumbMap.set(v.id, data);
      })
    );

    const pptx = new PptxGenJS();
    (pptx as any).layout = 'LAYOUT_WIDE'; // 16:9

    this.addCoverSlide(pptx, videos.length);
    if (trend) this.addTrendSlide(pptx, trend);

    const groups = TASK_TYPE_ORDER.map((cat) => ({
      cat,
      items: videos.filter((v) => (v.taskTypes && v.taskTypes[0] ? v.taskTypes[0] : '미분류') === cat),
    })).filter((g) => g.items.length > 0);

    for (const g of groups) {
      this.addCategorySlides(pptx, g.cat, g.items, thumbMap);
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    return buffer;
  }

  private addCoverSlide(pptx: PptxGenJS, videoCount: number) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    slide.addText('WRC 2026 특집 — 영상 브리프', {
      x: 0.8, y: 1.5, w: '85%', h: 1.5,
      fontSize: 32, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
    });

    slide.addText(`World Robot Conference 2026 · 수집 영상 ${videoCount}건`, {
      x: 0.8, y: 3.2, w: '85%', h: 0.6,
      fontSize: 16, fontFace: 'Arial', color: SUBTLE_COLOR,
    });

    slide.addShape('rect' as any, {
      x: 0.8, y: 4.2, w: 3, h: 0.04, fill: { color: ACCENT_COLOR },
    });

    slide.addText(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, {
      x: 0.8, y: 4.5, w: '85%', h: 0.5,
      fontSize: 12, fontFace: 'Arial', color: ACCENT_COLOR,
    });
  }

  private addTrendSlide(pptx: PptxGenJS, trend: NonNullable<EventTrendSummary>) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    slide.addText(trend.headline.slice(0, 120), {
      x: 0.8, y: 0.4, w: 11.7, h: 1.0,
      fontSize: 22, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      valign: 'top', wrap: true, fit: 'shrink',
    });

    const bulletParas = trend.points.slice(0, 6).map((p) => ({
      text: p.slice(0, 160),
      options: { bullet: true, breakLine: true, paraSpaceAfter: 8 },
    }));

    slide.addText(bulletParas as any, {
      x: 0.8, y: 1.6, w: 11.7, h: 5.0,
      fontSize: 14, fontFace: 'Arial', color: TEXT_COLOR,
      valign: 'top', lineSpacingMultiple: 1.3,
    });
  }

  private addCategorySlides(pptx: PptxGenJS, cat: string, items: EventVideo[], thumbMap: Map<string, string>) {
    const total = items.length;
    for (let i = 0; i < items.length; i += VIDEOS_PER_SLIDE) {
      const chunk = items.slice(i, i + VIDEOS_PER_SLIDE);
      const isContinued = i > 0;
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      slide.addText(`${cat} (${total}건)${isContinued ? ' (계속)' : ''}`, {
        x: 0.35, y: 0.2, w: 12.6, h: 0.55,
        fontSize: 20, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      });

      // 좌측 단에 0~2번, 우측 단에 3~5번 (세로 채우기)
      chunk.forEach((v, idx) => {
        const col = Math.floor(idx / ROWS_PER_COLUMN);
        const row = idx % ROWS_PER_COLUMN;
        const colX = COLUMN_X[col] ?? COLUMN_X[0] ?? 0.35;
        this.addVideoCell(slide, v, thumbMap.get(v.id) ?? null, colX, CONTENT_START_Y + row * ROW_HEIGHT);
      });
    }
  }

  /** 한 단(半) 셀: 썸네일 좌측, 제목/메타/URL 우측, 브리프는 셀 하단 전폭 */
  private addVideoCell(slide: any, v: EventVideo, thumbData: string | null, x: number, y: number) {
    const videoId = extractVideoId(v.url);
    const shortUrl = videoId ? `youtu.be/${videoId}` : v.url.slice(0, 40);
    const thumbW = 1.6;
    const thumbH = 0.9;
    const textX = x + thumbW + 0.15;
    const textW = CELL_WIDTH - thumbW - 0.15;

    if (thumbData) {
      // sizing cover: 4:3 원본(hqdefault)을 16:9 박스에 왜곡 없이 크롭
      slide.addImage({
        data: thumbData,
        x, y: y + 0.05, w: thumbW, h: thumbH,
        sizing: { type: 'cover', w: thumbW, h: thumbH },
      });
    }

    const titleText = ((v.titleKo ?? v.title) || '').slice(0, 100);
    slide.addText(titleText, {
      x: textX, y, w: textW, h: 0.45,
      fontSize: 10.5, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      valign: 'top', wrap: true, fit: 'shrink',
    });
    let cursorY = y + 0.46;

    if (v.titleKo) {
      slide.addText(v.title.slice(0, 90), {
        x: textX, y: cursorY, w: textW, h: 0.17,
        fontSize: 7, fontFace: 'Arial', color: SUBTLE_COLOR,
        valign: 'top', wrap: false, fit: 'shrink',
      });
      cursorY += 0.17;
    }

    const metaParts = [v.channel, formatDate(v.publishedAt), v.thirdParty ? '외부' : null].filter(
      (p): p is string => !!p
    );
    if (metaParts.length > 0) {
      slide.addText(metaParts.join(' · '), {
        x: textX, y: cursorY, w: textW, h: 0.19,
        fontSize: 8, fontFace: 'Arial', color: SUBTLE_COLOR, valign: 'top', fit: 'shrink',
      });
      cursorY += 0.19;
    }

    slide.addText(
      [{ text: shortUrl, options: { hyperlink: { url: v.url }, color: ACCENT_COLOR, underline: true } }],
      {
        x: textX, y: cursorY, w: textW, h: 0.19,
        fontSize: 8, fontFace: 'Arial', valign: 'top', wrap: false,
      }
    );

    if (v.brief) {
      const lines = briefLines(v.brief);
      if (lines.length > 0) {
        slide.addText(lines.join('\n'), {
          x, y: y + 1.05, w: CELL_WIDTH, h: 0.85,
          fontSize: 8, fontFace: 'Arial', color: TEXT_COLOR,
          valign: 'top', lineSpacingMultiple: 1.12, fit: 'shrink',
        });
      }
    }
  }
}

export const eventVideoPptService = new EventVideoPptService();
