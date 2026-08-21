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
const VIDEOS_PER_SLIDE = 3;
const ROW_HEIGHT = 1.55;
const CONTENT_START_Y = 1.1;

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
    lines.push(`주요 제품: ${brief.mainProducts.slice(0, 2).join(' · ')}`.slice(0, 140));
  }
  if (brief.demoContents.length > 0) {
    lines.push(`시연: ${brief.demoContents.slice(0, 2).join(' · ')}`.slice(0, 140));
  }
  if (brief.insights.length > 0) {
    lines.push(`시사점: ${brief.insights.slice(0, 2).join(' · ')}`.slice(0, 140));
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
        x: 0.4, y: 0.25, w: 12.5, h: 0.6,
        fontSize: 20, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      });

      chunk.forEach((v, idx) => {
        this.addVideoRow(slide, v, thumbMap.get(v.id) ?? null, CONTENT_START_Y + idx * ROW_HEIGHT);
      });
    }
  }

  private addVideoRow(slide: any, v: EventVideo, thumbData: string | null, y: number) {
    const videoId = extractVideoId(v.url);
    const shortUrl = videoId ? `youtu.be/${videoId}` : v.url.slice(0, 40);

    if (thumbData) {
      slide.addImage({ data: thumbData, x: 0.4, y: y + 0.05, w: 1.9, h: (1.9 * 9) / 16 });
    }

    const titleText = ((v.titleKo ?? v.title) || '').slice(0, 120);
    slide.addText(titleText, {
      x: 2.5, y, w: 7.2, h: 0.55,
      fontSize: 12, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      valign: 'top', wrap: true, fit: 'shrink',
    });
    let cursorY = y + 0.55;

    if (v.titleKo) {
      slide.addText(v.title.slice(0, 110), {
        x: 2.5, y: cursorY, w: 7.2, h: 0.22,
        fontSize: 8, fontFace: 'Arial', color: SUBTLE_COLOR,
        valign: 'top', wrap: false, fit: 'shrink',
      });
      cursorY += 0.22;
    }

    const metaParts = [v.channel, formatDate(v.publishedAt), v.thirdParty ? '외부' : null].filter(
      (p): p is string => !!p
    );
    if (metaParts.length > 0) {
      slide.addText(metaParts.join(' · '), {
        x: 2.5, y: cursorY, w: 7.2, h: 0.24,
        fontSize: 9, fontFace: 'Arial', color: SUBTLE_COLOR, valign: 'top',
      });
    }
    cursorY += 0.24;

    if (v.brief) {
      const lines = briefLines(v.brief);
      if (lines.length > 0) {
        slide.addText(lines.join('\n'), {
          x: 2.5, y: cursorY, w: 7.2, h: 0.55,
          fontSize: 9, fontFace: 'Arial', color: TEXT_COLOR,
          valign: 'top', lineSpacingMultiple: 1.15, fit: 'shrink',
        });
      }
    }

    slide.addText(
      [{ text: shortUrl, options: { hyperlink: { url: v.url }, color: ACCENT_COLOR, underline: true } }],
      {
        x: 10.0, y, w: 2.9, h: 0.4,
        fontSize: 9, fontFace: 'Arial', valign: 'top', wrap: true,
      }
    );
  }
}

export const eventVideoPptService = new EventVideoPptService();
