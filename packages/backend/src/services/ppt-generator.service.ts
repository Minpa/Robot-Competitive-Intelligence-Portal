/**
 * PPT 리포트 생성 서비스
 * pptxgenjs로 실제 .pptx 바이너리를 생성하고,
 * Claude API로 AI 코멘터리를 추가한다.
 */

import PptxGenJS from 'pptxgenjs';
import Anthropic from '@anthropic-ai/sdk';
import { companyService } from './company.service.js';
import { productService } from './product.service.js';
import { dashboardService } from './dashboard.service.js';
import { aiUsageService } from './ai-usage.service.js';

export type PPTTemplate = 'market_overview' | 'company_deep_dive' | 'tech_components' | 'use_case';
export type PPTTheme = 'light' | 'dark';

export interface PPTGenerationOptions {
  template: PPTTemplate;
  theme: PPTTheme;
  title: string;
  subtitle?: string;
  companyIds?: string[];
  robotIds?: string[];
  includeCharts?: boolean;
  includeTables?: boolean;
  includeAICommentary?: boolean;
}

export interface PPTGenerationResult {
  buffer: Buffer;
  metadata: {
    template: PPTTemplate;
    theme: PPTTheme;
    generatedAt: string;
    slideCount: number;
    filename: string;
  };
}

// 테마 색상
interface ThemeColors {
  bg: string;
  titleColor: string;
  textColor: string;
  subtitleColor: string;
  accentColor: string;
  tableBg: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableCellColor: string;
  tableBorder: { color: string };
}

const THEMES: { dark: ThemeColors; light: ThemeColors } = {
  dark: {
    bg: '0F172A',
    titleColor: 'E2E8F0',
    textColor: 'CBD5E1',
    subtitleColor: '94A3B8',
    accentColor: '8B5CF6',
    tableBg: '1E293B',
    tableHeaderBg: '334155',
    tableHeaderColor: 'E2E8F0',
    tableCellColor: 'CBD5E1',
    tableBorder: { color: '475569' },
  },
  light: {
    bg: 'FFFFFF',
    titleColor: '1E293B',
    textColor: '334155',
    subtitleColor: '64748B',
    accentColor: '7C3AED',
    tableBg: 'F8FAFC',
    tableHeaderBg: 'E2E8F0',
    tableHeaderColor: '1E293B',
    tableCellColor: '334155',
    tableBorder: { color: 'CBD5E1' },
  },
};

export class PPTGeneratorService {
  /**
   * .pptx 바이너리 생성
   */
  async generatePptx(options: PPTGenerationOptions): Promise<PPTGenerationResult> {
    const theme: ThemeColors = (options.theme === 'light' ? THEMES.light : THEMES.dark);
    const pptx = new PptxGenJS();
    (pptx as any).layout = 'LAYOUT_WIDE'; // 16:9

    // 타이틀 슬라이드
    this.addTitleSlide(pptx, options, theme);

    // 템플릿별 슬라이드 생성
    switch (options.template) {
      case 'market_overview':
        await this.addMarketOverviewSlides(pptx, options, theme);
        break;
      case 'company_deep_dive':
        await this.addCompanyDeepDiveSlides(pptx, options, theme);
        break;
      case 'tech_components':
        await this.addTechComponentsSlides(pptx, options, theme);
        break;
      case 'use_case':
        await this.addUseCaseSlides(pptx, options, theme);
        break;
    }

    // AI 코멘터리 슬라이드 (Claude)
    if (options.includeAICommentary !== false) {
      await this.addAICommentarySlide(pptx, options, theme);
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `HRI_Report_${options.template}_${timestamp}.pptx`;

    return {
      buffer,
      metadata: {
        template: options.template,
        theme: options.theme,
        generatedAt: new Date().toISOString(),
        slideCount: (pptx as any).slides?.length ?? 0,
        filename,
      },
    };
  }

  private addTitleSlide(pptx: PptxGenJS, options: PPTGenerationOptions, theme: ThemeColors) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };

    slide.addText(options.title, {
      x: 0.8, y: 1.5, w: '85%', h: 1.5,
      fontSize: 32, fontFace: 'Arial', color: theme.titleColor, bold: true,
    });

    slide.addText(options.subtitle || new Date().toLocaleDateString('ko-KR'), {
      x: 0.8, y: 3.2, w: '85%', h: 0.6,
      fontSize: 16, fontFace: 'Arial', color: theme.subtitleColor,
    });

    slide.addText('HRI Portal — 휴머노이드 로봇 인텔리전스', {
      x: 0.8, y: 4.5, w: '85%', h: 0.5,
      fontSize: 12, fontFace: 'Arial', color: theme.accentColor,
    });

    // 하단 라인
    slide.addShape('rect' as any, {
      x: 0.8, y: 4.2, w: 3, h: 0.04, fill: { color: theme.accentColor },
    });
  }

  private addSectionSlide(pptx: PptxGenJS, title: string, theme: ThemeColors) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    slide.addText(title, {
      x: 0.8, y: 0.3, w: '90%', h: 0.7,
      fontSize: 22, fontFace: 'Arial', color: theme.titleColor, bold: true,
    });
    return slide;
  }

  private addTableToSlide(
    slide: any,
    headers: string[],
    rows: string[][],
    theme: ThemeColors,
    opts?: { y?: number }
  ) {
    const headerRow = headers.map(h => ({
      text: h, options: { bold: true, color: theme.tableHeaderColor, fill: { color: theme.tableHeaderBg }, fontSize: 11 },
    }));
    const dataRows = rows.map(row =>
      row.map(cell => ({
        text: cell || '-', options: { color: theme.tableCellColor, fill: { color: theme.tableBg }, fontSize: 10 },
      }))
    );

    slide.addTable([headerRow, ...dataRows], {
      x: 0.8, y: opts?.y ?? 1.2, w: 11.5,
      border: { type: 'solid', pt: 0.5, color: theme.tableBorder.color },
      colW: Array(headers.length).fill(11.5 / headers.length),
      autoPage: false,
    });
  }

  // ── Market Overview ──
  private async addMarketOverviewSlides(pptx: PptxGenJS, _options: PPTGenerationOptions, theme: ThemeColors) {
    const summary = await dashboardService.getSummary();
    const robotSummary = await dashboardService.getRobotSummary();

    // KPI 슬라이드
    const kpiSlide = this.addSectionSlide(pptx, '시장 현황 KPI', theme);
    const kpis = [
      ['총 회사 수', String(summary.totalCompanies)],
      ['총 제품 수', String(summary.totalProducts)],
      ['총 로봇 수', String(summary.totalRobots)],
      ['총 기사 수', String(summary.totalArticles)],
      ['주간 신규 제품', String(summary.weeklyNewProducts)],
      ['주간 신규 기사', String(summary.weeklyNewArticles)],
    ];
    this.addTableToSlide(kpiSlide, ['지표', '수치'], kpis, theme);

    // 지역별 분포
    const regionSlide = this.addSectionSlide(pptx, '지역별 로봇 분포', theme);
    const regionRows = Object.entries(robotSummary.byRegion || {}).map(([r, c]) => [r, String(c)]);
    if (regionRows.length > 0) {
      this.addTableToSlide(regionSlide, ['지역', '로봇 수'], regionRows, theme);
    } else {
      regionSlide.addText('지역 데이터가 아직 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // 용도별 분포
    const purposeSlide = this.addSectionSlide(pptx, '용도별 로봇 분포', theme);
    const purposeRows = Object.entries(robotSummary.byPurpose || {}).map(([p, c]) => [p, String(c)]);
    if (purposeRows.length > 0) {
      this.addTableToSlide(purposeSlide, ['용도', '로봇 수'], purposeRows, theme);
    } else {
      purposeSlide.addText('용도 데이터가 아직 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }
  }

  // ── Company Deep Dive ──
  private async addCompanyDeepDiveSlides(pptx: PptxGenJS, options: PPTGenerationOptions, theme: ThemeColors) {
    let companyIds = options.companyIds || [];
    if (companyIds.length === 0) {
      const companies = await companyService.list({}, { page: 1, pageSize: 5, sortOrder: 'desc' });
      companyIds = companies.items.map(c => c.id);
    }

    for (const companyId of companyIds.slice(0, 5)) {
      const company = await companyService.getById(companyId);
      if (!company) continue;

      const slide = this.addSectionSlide(pptx, company.name, theme);
      slide.addText(`${company.country || '-'} | ${company.category || '-'}`, {
        x: 0.8, y: 1.0, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });

      const info = [
        ['국가', company.country || '-'],
        ['카테고리', company.category || '-'],
        ['홈페이지', company.homepageUrl || '-'],
        ['설명', (company.description || '-').substring(0, 100)],
      ];
      this.addTableToSlide(slide, ['항목', '정보'], info, theme, { y: 1.6 });

      // 제품 목록
      const products = await productService.list({ companyId }, { page: 1, pageSize: 10, sortOrder: 'desc' });
      if (products.items.length > 0) {
        const prodSlide = this.addSectionSlide(pptx, `${company.name} — 제품`, theme);
        const prodRows = products.items.map(p => [p.name, p.type || '-', p.releaseDate || '-', p.status || '-']);
        this.addTableToSlide(prodSlide, ['제품명', '유형', '출시일', '상태'], prodRows, theme);
      }
    }
  }

  // ── Tech Components ──
  private async addTechComponentsSlides(pptx: PptxGenJS, _options: PPTGenerationOptions, theme: ThemeColors) {
    const rfmTimeline = await dashboardService.getRfmTimeline();
    const actuatorTimeline = await dashboardService.getActuatorTimeline();
    const socTimeline = await dashboardService.getSocTimeline();

    if (rfmTimeline.length > 0) {
      const slide = this.addSectionSlide(pptx, 'Robot Foundation Models', theme);
      const rows = rfmTimeline.slice(0, 10).map(r => [r.name, r.companyName, r.releaseDate || '-']);
      this.addTableToSlide(slide, ['모델명', '회사', '출시일'], rows, theme);
    }

    if (actuatorTimeline.length > 0) {
      const slide = this.addSectionSlide(pptx, '액추에이터', theme);
      const rows = actuatorTimeline.slice(0, 10).map(a => [a.name, a.companyName, a.releaseDate || '-']);
      this.addTableToSlide(slide, ['제품명', '회사', '출시일'], rows, theme);
    }

    if (socTimeline.length > 0) {
      const slide = this.addSectionSlide(pptx, 'SoC / AI 칩', theme);
      const rows = socTimeline.slice(0, 10).map(s => [s.name, s.companyName, s.releaseDate || '-']);
      this.addTableToSlide(slide, ['제품명', '회사', '출시일'], rows, theme);
    }
  }

  // ── Use Case ──
  private async addUseCaseSlides(pptx: PptxGenJS, _options: PPTGenerationOptions, theme: ThemeColors) {
    const deploymentStatus = await dashboardService.getDeploymentStatusDistribution();
    const demoTimeline = await dashboardService.getDemoTimeline();

    if (deploymentStatus.length > 0) {
      const slide = this.addSectionSlide(pptx, '배포 상태 분포', theme);
      const rows = deploymentStatus.map(d => [d.status || 'Unknown', String(d.count)]);
      this.addTableToSlide(slide, ['상태', '건수'], rows, theme);
    }

    if (demoTimeline.length > 0) {
      const slide = this.addSectionSlide(pptx, '최근 시연 이벤트', theme);
      const rows = demoTimeline.slice(0, 10).map(d => [
        d.demoDate || '-', d.robotName || '-', d.companyName || '-', d.demoEvent || '-',
      ]);
      this.addTableToSlide(slide, ['날짜', '로봇', '회사', '이벤트'], rows, theme);
    }
  }

  // ── Claude AI 코멘터리 ──
  private async addAICommentarySlide(pptx: PptxGenJS, options: PPTGenerationOptions, theme: ThemeColors) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[PPTGenerator] ANTHROPIC_API_KEY 없음, AI 코멘터리 스킵');
      return;
    }

    // 월간 비용 한도 체크
    try {
      const currentCost = await aiUsageService.getCurrentMonthCostUsd();
      if (currentCost >= 7.0) {
        const slide = this.addSectionSlide(pptx, 'AI 코멘터리', theme);
        slide.addText('이번 달 AI 사용 한도에 도달하여 코멘터리를 생성할 수 없습니다.', {
          x: 0.8, y: 1.5, w: '90%', fontSize: 14, color: theme.subtitleColor,
        });
        return;
      }
    } catch { /* 비용 체크 실패 시 계속 진행 */ }

    try {
      const summary = await dashboardService.getSummary();
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const templateLabels: Record<string, string> = {
        market_overview: '시장 현황',
        company_deep_dive: '기업 심층 분석',
        tech_components: '기술 부품 동향',
        use_case: '적용 사례',
      };

      const prompt = `당신은 휴머노이드 로봇 산업 전문 분석가입니다.
아래 데이터를 기반으로 "${templateLabels[options.template] || options.template}" 리포트에 대한 경영진 코멘터리를 한국어로 작성하세요.

데이터:
- 총 회사: ${summary.totalCompanies}개
- 총 제품: ${summary.totalProducts}개
- 총 로봇: ${summary.totalRobots}개
- 총 기사: ${summary.totalArticles}개
- 주간 신규 제품: ${summary.weeklyNewProducts}개
- 주간 신규 기사: ${summary.weeklyNewArticles}개

요구사항:
- 3~5문장의 핵심 인사이트
- 시장 트렌드 1~2가지
- 주의할 점 또는 기회 1가지
- 총 200자 이내로 간결하게`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      const commentary = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      // 사용량 기록
      aiUsageService.logUsage({
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        webSearch: false,
        inputTokens: Math.ceil(prompt.length / 3),
        outputTokens: Math.ceil(commentary.length / 3),
        query: `PPT AI Commentary: ${options.template}`,
      }).catch(() => {});

      if (commentary) {
        const slide = this.addSectionSlide(pptx, 'AI 인사이트 코멘터리', theme);
        slide.addText(commentary, {
          x: 0.8, y: 1.3, w: '90%', h: 3.5,
          fontSize: 14, fontFace: 'Arial', color: theme.textColor,
          valign: 'top', wrap: true, lineSpacingMultiple: 1.4,
        });
        slide.addText('* Claude AI 기반 자동 생성 코멘터리', {
          x: 0.8, y: 5.0, w: '90%', fontSize: 9, color: theme.subtitleColor, italic: true,
        });
      }
    } catch (err) {
      console.error('[PPTGenerator] AI 코멘터리 생성 실패:', err);
    }
  }

  /**
   * 사용 가능한 템플릿 목록
   */
  getTemplates(): { id: PPTTemplate; name: string; description: string }[] {
    return [
      { id: 'market_overview', name: '시장 현황', description: '시장 현황 및 트렌드 요약' },
      { id: 'company_deep_dive', name: '기업 심층 분석', description: '특정 회사 심층 분석' },
      { id: 'tech_components', name: '기술 부품 동향', description: '기술 부품 동향 분석' },
      { id: 'use_case', name: '적용 사례', description: '적용 사례 및 시연 분석' },
    ];
  }
}

export const pptGeneratorService = new PPTGeneratorService();
