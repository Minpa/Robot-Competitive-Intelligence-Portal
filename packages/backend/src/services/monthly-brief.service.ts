/**
 * MonthlyBriefGenerator - 월간 브리프 생성
 * 
 * 집계 JSON → Markdown 브리프 + PPTX 변환
 * LLM 실패 시 템플릿 기반 폴백
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MonthlyBriefResult {
  markdown: string;
  pptxBuffer: Buffer;
  generatedAt: Date;
  period: { start: Date; end: Date };
}

export class MonthlyBriefGenerator {
  async generate(aggregationJson: Record<string, unknown>): Promise<MonthlyBriefResult> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    let markdown: string;

    if (process.env.OPENAI_API_KEY) {
      try {
        markdown = await this.generateMarkdown(aggregationJson);
      } catch (error) {
        console.error('[MonthlyBrief] LLM failed, using fallback', error);
        markdown = this.generateFallbackMarkdown(aggregationJson);
      }
    } else {
      markdown = this.generateFallbackMarkdown(aggregationJson);
    }

    let pptxBuffer: Buffer;
    try {
      pptxBuffer = await this.generatePptx(markdown, aggregationJson);
    } catch (error) {
      console.error('[MonthlyBrief] PPTX generation failed', error);
      pptxBuffer = Buffer.from('');
    }

    return { markdown, pptxBuffer, generatedAt: now, period: { start, end } };
  }

  private async generateMarkdown(data: Record<string, unknown>): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a robotics industry analyst. Generate a monthly brief in Korean Markdown format.
Include sections: 요약, 주요 동향, 세그먼트 분석, 부품 트렌드, 키워드 동향, 시사점.
Be concise and data-driven.`,
        },
        { role: 'user', content: `Generate monthly brief from:\n${JSON.stringify(data).substring(0, 3000)}` },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });

    return response.choices[0]?.message?.content || this.generateFallbackMarkdown(data);
  }

  private async generatePptx(markdown: string, data: Record<string, unknown>): Promise<Buffer> {
    // pptxgenjs 동적 import (설치되어 있을 때만)
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();

      // 타이틀 슬라이드
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: '0F172A' };
      titleSlide.addText('월간 휴머노이드 로봇 산업 브리프', {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fontSize: 28, color: 'FFFFFF', bold: true, align: 'center',
      });
      const now = new Date();
      titleSlide.addText(`${now.getFullYear()}년 ${now.getMonth() + 1}월`, {
        x: 0.5, y: 3, w: 9, h: 0.5,
        fontSize: 16, color: '94A3B8', align: 'center',
      });

      // 내용 슬라이드 (마크다운 섹션별)
      const sections = markdown.split(/^## /m).filter(s => s.trim());
      for (const section of sections.slice(0, 6)) {
        const slide = pptx.addSlide();
        slide.background = { color: '0F172A' };
        const lines = section.split('\n');
        const title = lines[0]?.replace(/^#+\s*/, '') || '';
        const body = lines.slice(1).join('\n').trim().substring(0, 500);

        slide.addText(title, {
          x: 0.5, y: 0.3, w: 9, h: 0.8,
          fontSize: 22, color: 'FFFFFF', bold: true,
        });
        slide.addText(body, {
          x: 0.5, y: 1.3, w: 9, h: 4,
          fontSize: 12, color: 'CBD5E1', valign: 'top',
        });
      }

      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      return buffer as Buffer;
    } catch {
      console.warn('[MonthlyBrief] pptxgenjs not available');
      return Buffer.from('');
    }
  }

  generateFallbackMarkdown(data: Record<string, unknown>): string {
    const now = new Date();
    const segments = (data.segments || []) as any[];
    const yearly = (data.yearly || []) as any[];
    const comps = (data.components || []) as any[];
    const kws = (data.keywords || []) as any[];

    const totalCases = segments.reduce((s: number, seg: any) => s + (seg.caseCount || 0), 0);

    return `# 월간 휴머노이드 로봇 산업 브리프
## ${now.getFullYear()}년 ${now.getMonth() + 1}월

## 요약
- 활성 세그먼트: ${segments.length}개
- 총 적용 사례: ${totalCases}건
- 등록 부품: ${comps.length}개
- 추적 키워드: ${kws.length}개

## 세그먼트 분석
${segments.slice(0, 5).map((s: any) => `- ${s.environment}/${s.task} (${s.locomotion}): 로봇 ${s.robotCount}대, 사례 ${s.caseCount}건`).join('\n') || '- 데이터 없음'}

## 연도별 동향
${yearly.slice(-5).map((y: any) => `- ${y.year}년: 출시 ${y.launches}건, 적용 ${y.applications}건`).join('\n') || '- 데이터 없음'}

## 부품 트렌드
${comps.slice(0, 5).map((c: any) => `- ${c.componentName} (${c.componentType}): 채택 ${c.adoptionCount}건`).join('\n') || '- 데이터 없음'}

## 키워드 동향
${kws.slice(0, 10).map((k: any) => `- ${k.term}: 기사 ${k.articleCount}건`).join('\n') || '- 데이터 없음'}

## 시사점
데이터 기반 분석이 필요합니다. 더 많은 기사와 엔티티 데이터가 축적되면 정확한 인사이트를 제공할 수 있습니다.

---
*자동 생성: ${now.toISOString()}*
`;
  }
}

export const monthlyBriefGenerator = new MonthlyBriefGenerator();
