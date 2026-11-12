/**
 * add_source 처리기 — 공개 자료 메타(제목·링크·게시일)만 articles 에 저장한다. 본문은 저장하지 않는다.
 *
 * 서비스·저장은 의존성 주입으로 받는다 (테스트는 가짜를 주입). 입력은 `params` 뿐이고 note 는 타입에 없다.
 * 저장 직전 인제스트 가드(`ingest` 프로파일)를 제목·요약·링크에 적용한다 — 외부 메타가 사내 표지를 담고 있으면 저장하지 않는다.
 *
 * 저장은 `ingestArticles` 가 아니라 `saveArticle` 주입점으로 한다: ingest 스키마의 productType 에 'video' 가 없고,
 * 크롤러가 쓰는 content_hash 규칙(YouTube md5 `yt-video-<id>`, arXiv md5 abs 링크)을 그대로 써야 중복이 스킵된다.
 */

import { createHash } from 'crypto';
import type { ArxivClient } from '../argos-i-requests-arxiv.js';
import { cleanItems, cleanLink, cleanObject, cleanText, textRule, type ResultCtx } from '../argos-i-requests-result.js';
import type { ArticleMeta } from '../argos-i-requests-article-meta.js';
import type { YoutubeClient, YoutubeVideoMeta } from '../argos-i-requests-youtube.js';
import { failOutcome, okOutcome, outcomeFromError, type HandlerOutcome, type RequestHandler } from './types.js';

export interface SaveArticleItem {
  contentHash: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date | null;
  summary: string | null;
  language: string;
  category: string;
  productType: string;
  /** 채널 이름 등으로 기존 회사를 찾는 데 쓴다. 없거나 못 찾으면 회사 미지정(null) */
  companyHint: string | null;
  extractedMetadata: Record<string, unknown>;
}

export interface AddSourceDeps {
  youtube: YoutubeClient;
  arxiv: ArxivClient;
  fetchArticleMeta(url: string): Promise<ArticleMeta>;
  saveArticle(item: SaveArticleItem): Promise<'inserted' | 'skipped'>;
  /** 인제스트 프로파일 가드 — 사유 코드 목록 (비어 있으면 통과) */
  guardFields(fields: Array<{ value: unknown; kind: 'url' | 'free' }>): string[];
  allowedHosts(): Promise<string[]>;
}

export const CHANNEL_RECENT_MAX = 10;
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function toDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function videoItem(v: YoutubeVideoMeta): SaveArticleItem {
  const channel = v.channelTitle ?? 'YouTube';
  return {
    contentHash: md5(`yt-video-${v.id}`), // crawler 와 같은 규칙 → 중복 스킵
    title: v.title.slice(0, 500),
    source: `YouTube — ${channel}`.slice(0, 255),
    url: watchUrl(v.id),
    publishedAt: toDate(v.publishedAt),
    summary: null,
    language: 'en',
    category: 'product',
    productType: 'video',
    companyHint: v.channelTitle,
    extractedMetadata: {
      videoId: v.id,
      channel,
      ...(v.channelId ? { channelId: v.channelId } : {}),
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    },
  };
}

interface Tally {
  inserted: number;
  skipped: number;
  rejected: number;
  items: Array<{ title: string; url: string }>;
}

export function createAddSourceHandler(deps: AddSourceDeps): RequestHandler {
  const save = async (item: SaveArticleItem, tally: Tally) => {
    if (deps.guardFields([{ value: item.title, kind: 'free' }, { value: item.summary, kind: 'free' }, { value: item.url, kind: 'url' }]).length > 0) {
      tally.rejected += 1;
      return;
    }
    const r = await deps.saveArticle(item);
    if (r === 'inserted') tally.inserted += 1;
    else tally.skipped += 1;
    tally.items.push({ title: item.title, url: item.url });
  };

  const finish = async (kind: string, tally: Tally): Promise<HandlerOutcome> => {
    const ctx: ResultCtx = { allowedHosts: await deps.allowedHosts() };
    const items = cleanItems(tally.items, 10, (it) => {
      const o = cleanObject(it, { title: textRule() });
      const rawUrl = (it as { url?: unknown }).url;
      // arXiv abs 링크는 저장 형식이 http 라서, 응답에는 https 로 바꿔 준다
      const link = typeof rawUrl === 'string' ? cleanLink(rawUrl.replace(/^http:\/\/arxiv\.org\//, 'https://arxiv.org/'), ctx) : null;
      return typeof o.title === 'string' ? { title: o.title, url: link } : null;
    });
    return okOutcome({ kind, inserted: tally.inserted, skipped: tally.skipped, rejected: tally.rejected, items });
  };

  return {
    async run(params): Promise<HandlerOutcome> {
      try {
        switch (params.kind) {
          case 'youtube_video': {
            const meta = await deps.youtube.getVideo(String(params.id));
            if (!meta) return failOutcome('not_found');
            const tally: Tally = { inserted: 0, skipped: 0, rejected: 0, items: [] };
            await save(videoItem(meta), tally);
            if (tally.rejected > 0) return failOutcome('invalid_target');
            return finish('youtube_video', tally);
          }
          case 'youtube_channel': {
            const r = await deps.youtube.getRecentUploads(String(params.id), CHANNEL_RECENT_MAX);
            if (!r) return failOutcome('not_found');
            const tally: Tally = { inserted: 0, skipped: 0, rejected: 0, items: [] };
            for (const v of r.videos.slice(0, CHANNEL_RECENT_MAX)) await save(videoItem(v), tally);
            return finish('youtube_channel', tally);
          }
          case 'arxiv': {
            const e = await deps.arxiv.getEntry(String(params.id));
            if (!e) return failOutcome('not_found');
            const tally: Tally = { inserted: 0, skipped: 0, rejected: 0, items: [] };
            await save(
              {
                contentHash: md5(e.entryId), // crawler 와 같은 규칙
                title: e.title.slice(0, 500),
                source: 'arxiv',
                url: e.entryId,
                publishedAt: toDate(e.publishedAt),
                summary: e.summary || null,
                language: 'en',
                category: 'technology',
                productType: 'none',
                companyHint: null,
                extractedMetadata: { arxivId: e.arxivId },
              },
              tally,
            );
            if (tally.rejected > 0) return failOutcome('invalid_target');
            return finish('arxiv', tally);
          }
          case 'article_url': {
            const url = String(params.url);
            const meta = await deps.fetchArticleMeta(url);
            const title = cleanText(meta.title, 400);
            if (!title) return failOutcome('not_found');
            const tally: Tally = { inserted: 0, skipped: 0, rejected: 0, items: [] };
            await save(
              {
                contentHash: sha256(`argos-i-article:${url}`),
                title,
                source: new URL(url).hostname.replace(/^www\./, '').slice(0, 255),
                url,
                publishedAt: null,
                summary: null, // 제목·링크만 저장한다 (본문 수집 없음)
                language: 'en',
                category: 'other',
                productType: 'none',
                companyHint: null,
                extractedMetadata: {},
              },
              tally,
            );
            if (tally.rejected > 0) return failOutcome('invalid_target');
            return finish('article_url', tally);
          }
          default:
            return failOutcome('invalid_target');
        }
      } catch (err) {
        return outcomeFromError(err);
      }
    },
  };
}
