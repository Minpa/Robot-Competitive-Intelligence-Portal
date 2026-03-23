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
import { humanoidTrendService } from './humanoid-trend.service.js';
import { executiveDashboardService } from './executive-dashboard.service.js';

export type PPTTemplate = 'market_overview' | 'company_deep_dive' | 'tech_components' | 'use_case' | 'humanoid_trend';
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
  chartImages?: string[];
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
      case 'humanoid_trend':
        await this.addHumanoidTrendSlides(pptx, options, theme);
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

  // ── Humanoid Trend ──
  private async addHumanoidTrendSlides(pptx: PptxGenJS, options: PPTGenerationOptions, theme: ThemeColors): Promise<void> {
    const chartTitles = [
      '산업용 PoC 팩터별 역량 비교',
      'RFM 역량 비교',
      'RFM 경쟁력 포지셔닝 맵',
      '산업용 PoC 로봇 포지셔닝 맵',
      'TOPS × SoC 에코시스템 포지셔닝 맵',
      '산업 배치 핵심 스펙 비교',
    ];

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: theme.bg };
    titleSlide.addText('휴머노이드 동향 리포트', {
      x: 0.8, y: 1.5, w: '85%', h: 1.5,
      fontSize: 32, fontFace: 'Arial', color: theme.titleColor, bold: true,
    });
    titleSlide.addText(new Date().toLocaleDateString('ko-KR'), {
      x: 0.8, y: 3.2, w: '85%', h: 0.6,
      fontSize: 16, fontFace: 'Arial', color: theme.subtitleColor,
    });
    titleSlide.addText('HRI Portal — 휴머노이드 로봇 인텔리전스', {
      x: 0.8, y: 4.5, w: '85%', h: 0.5,
      fontSize: 12, fontFace: 'Arial', color: theme.accentColor,
    });
    titleSlide.addShape('rect' as any, {
      x: 0.8, y: 4.2, w: 3, h: 0.04, fill: { color: theme.accentColor },
    });

    const chartImages = options.chartImages || [];

    if (chartImages.length > 0) {
      // Insert chart images as slides
      for (let i = 0; i < chartTitles.length; i++) {
        const title = chartTitles[i]!;
        const slide = this.addSectionSlide(pptx, title, theme);
        const img = chartImages[i];
        if (img) {
          slide.addImage({
            data: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
            x: 0.5, y: 1.1, w: 12, h: 5.5,
          });
        }
      }
    } else {
      // Data table fallback
      await this.addHumanoidTrendFallbackSlides(pptx, chartTitles as [string, string, string, string, string, string], theme);
    }
  }

  private async addHumanoidTrendFallbackSlides(pptx: PptxGenJS, chartTitles: [string, string, string, string, string, string], theme: ThemeColors): Promise<void> {
    // Slide 1: PoC Factor Radar
    const pocScores = await humanoidTrendService.getPocScores();
    const pocSlide = this.addSectionSlide(pptx, chartTitles[0], theme);
    if (pocScores.length > 0) {
      const headers = ['로봇', '회사', '페이로드', '운용시간', '핑거DoF', '폼팩터', 'PoC배포', '가성비', '평균'];
      const rows = pocScores.map(s => [
        s.robotName, s.companyName,
        String(s.payloadScore), String(s.operationTimeScore), String(s.fingerDofScore),
        String(s.formFactorScore), String(s.pocDeploymentScore), String(s.costEfficiencyScore),
        String(s.averageScore),
      ]);
      this.addTableToSlide(pocSlide, headers, rows, theme);
    } else {
      pocSlide.addText('PoC 평가 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // Slide 2: RFM Overlay Radar
    const rfmScores = await humanoidTrendService.getRfmScores();
    const rfmSlide = this.addSectionSlide(pptx, chartTitles[1], theme);
    if (rfmScores.length > 0) {
      const headers = ['로봇', 'RFM 모델', '모델 아키텍처', '데이터', '엣지 추론', '오픈소스', '상용성'];
      const rows = rfmScores.map(s => [
        s.robotName,
        s.rfmModelName,
        String(s.architectureScore),
        String(s.dataScore),
        String(s.inferenceScore),
        String(s.openSourceScore),
        String(s.maturityScore),
      ]);
      this.addTableToSlide(rfmSlide, headers, rows, theme);
    } else {
      rfmSlide.addText('RFM 평가 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // Slide 3: RFM Competitiveness Positioning
    const rfmPos = await humanoidTrendService.getPositioningData('rfm_competitiveness');
    const rfmPosSlide = this.addSectionSlide(pptx, chartTitles[2], theme);
    if (rfmPos.length > 0) {
      const headers = ['라벨', 'X (엣지추론)', 'Y (범용성)', '버블 크기', '색상 그룹'];
      const rows = rfmPos.map(d => [
        d.label, String(d.xValue), String(d.yValue), String(d.bubbleSize), d.colorGroup || '-',
      ]);
      this.addTableToSlide(rfmPosSlide, headers, rows, theme);
    } else {
      rfmPosSlide.addText('RFM 포지셔닝 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // Slide 4: PoC Robot Positioning
    const pocPos = await humanoidTrendService.getPositioningData('poc_positioning');
    const pocPosSlide = this.addSectionSlide(pptx, chartTitles[3], theme);
    if (pocPos.length > 0) {
      const headers = ['라벨', 'X (폼팩터)', 'Y (산업적합성)', '버블 크기', '색상 그룹'];
      const rows = pocPos.map(d => [
        d.label, String(d.xValue), String(d.yValue), String(d.bubbleSize), d.colorGroup || '-',
      ]);
      this.addTableToSlide(pocPosSlide, headers, rows, theme);
    } else {
      pocPosSlide.addText('PoC 포지셔닝 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // Slide 5: SoC Ecosystem Positioning
    const socPos = await humanoidTrendService.getPositioningData('soc_ecosystem');
    const socPosSlide = this.addSectionSlide(pptx, chartTitles[4], theme);
    if (socPos.length > 0) {
      const headers = ['라벨', 'X (SoC 수준)', 'Y (TOPS)', '버블 크기', '색상 그룹'];
      const rows = socPos.map(d => [
        d.label, String(d.xValue), String(d.yValue), String(d.bubbleSize), d.colorGroup || '-',
      ]);
      this.addTableToSlide(socPosSlide, headers, rows, theme);
    } else {
      socPosSlide.addText('SoC 에코시스템 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }

    // Slide 6: Bar Spec Comparison
    const barSpecs = await humanoidTrendService.getBarSpecs();
    const barSlide = this.addSectionSlide(pptx, chartTitles[5], theme);
    if (barSpecs.length > 0) {
      const headers = ['로봇', '회사', '페이로드(kg)', '운용시간(h)', '핑거DoF', 'PoC배포(x/10)'];
      const rows = barSpecs.map(s => [
        s.robotName, s.companyName,
        s.payloadKg != null ? String(s.payloadKg) : '-',
        s.operationTimeHours != null ? String(s.operationTimeHours) : '-',
        s.handDof != null ? String(s.handDof) : '-',
        s.pocDeploymentScore != null ? String(s.pocDeploymentScore) : '-',
      ]);
      this.addTableToSlide(barSlide, headers, rows, theme);
    } else {
      barSlide.addText('스펙 비교 데이터가 등록되지 않았습니다.', {
        x: 0.8, y: 2, w: '90%', fontSize: 14, color: theme.subtitleColor,
      });
    }
  }

  // ── Claude AI 코멘터리 ──

  /**
   * 템플릿별로 풍부한 컨텍스트 데이터를 수집하여 AI 프롬프트에 전달
   */
  private async collectTemplateContext(template: PPTTemplate): Promise<string> {
    const summary = await dashboardService.getSummary();
    const baseSummary = `[시장 개요]
- 총 회사: ${summary.totalCompanies}개 / 총 로봇: ${summary.totalRobots}개 / 총 제품: ${summary.totalProducts}개
- 총 기사: ${summary.totalArticles}개
- 주간 신규 제품: ${summary.weeklyNewProducts}개 / 주간 신규 기사: ${summary.weeklyNewArticles}개`;

    const contextParts: string[] = [baseSummary];

    try {
      // 지역별 경쟁 구도
      const regional = await executiveDashboardService.getRegionalCompetition();
      if (regional.regions?.length > 0) {
        const regionLines = regional.regions
          .sort((a: any, b: any) => b.productCount - a.productCount)
          .slice(0, 6)
          .map((r: any) => `  ${r.region}: 회사 ${r.companyCount}개, 로봇 ${r.productCount}대`)
          .join('\n');
        contextParts.push(`[지역별 경쟁 구도]\n${regionLines}`);
      }

      // 최근 주요 이벤트
      const events = await executiveDashboardService.getTopEvents('month');
      if (events.events?.length > 0) {
        const eventLines = events.events
          .slice(0, 5)
          .map((e: any) => `  - ${e.title} (${e.date?.slice(0, 10) || '날짜 미상'})`)
          .join('\n');
        contextParts.push(`[최근 1개월 주요 이벤트]\n${eventLines}`);
      }
    } catch { /* 추가 데이터 수집 실패 시 기본 데이터만 사용 */ }

    // 템플릿별 심화 데이터
    try {
      switch (template) {
        case 'market_overview': {
          const robotSummary = await dashboardService.getRobotSummary();
          if (robotSummary.byPurpose) {
            const purposeLines = Object.entries(robotSummary.byPurpose)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([p, c]) => `  ${p}: ${c}대`)
              .join('\n');
            contextParts.push(`[용도별 로봇 분포]\n${purposeLines}`);
          }
          const industryAdoption = await executiveDashboardService.getIndustryAdoption();
          if (industryAdoption.industries?.length > 0) {
            const indLines = industryAdoption.industries
              .sort((a: any, b: any) => b.totalCases - a.totalCases)
              .slice(0, 5)
              .map((ind: any) => `  ${ind.industry}: ${ind.totalCases}건`)
              .join('\n');
            contextParts.push(`[산업별 적용 현황]\n${indLines}`);
          }
          break;
        }
        case 'company_deep_dive': {
          const highlights = await dashboardService.getEnhancedWeeklyHighlights(5);
          if (highlights.companyUpdates?.length > 0) {
            const compLines = highlights.companyUpdates
              .slice(0, 5)
              .map((c: any) => `  ${c.companyName}: 기사 ${c.articleCount}건`)
              .join('\n');
            contextParts.push(`[주간 주목 기업]\n${compLines}`);
          }
          if (highlights.newRobots?.length > 0) {
            const robotLines = highlights.newRobots
              .slice(0, 5)
              .map((r: any) => `  ${r.name} (${r.companyName || '미상'}) — ${r.purpose || '범용'}`)
              .join('\n');
            contextParts.push(`[주간 신규 로봇]\n${robotLines}`);
          }
          break;
        }
        case 'tech_components': {
          const rfmTimeline = await dashboardService.getRfmTimeline();
          const socTimeline = await dashboardService.getSocTimeline();
          if (rfmTimeline.length > 0) {
            const rfmLines = rfmTimeline.slice(0, 5)
              .map((r: any) => `  ${r.name} (${r.companyName}) — ${r.releaseDate || '날짜 미상'}`)
              .join('\n');
            contextParts.push(`[최신 Robot Foundation Models]\n${rfmLines}`);
          }
          if (socTimeline.length > 0) {
            const socLines = socTimeline.slice(0, 5)
              .map((s: any) => `  ${s.name} (${s.companyName}) — ${s.releaseDate || '날짜 미상'}`)
              .join('\n');
            contextParts.push(`[최신 SoC/AI 칩]\n${socLines}`);
          }
          break;
        }
        case 'use_case': {
          const deploymentStatus = await dashboardService.getDeploymentStatusDistribution();
          if (deploymentStatus.length > 0) {
            const statusLines = deploymentStatus
              .map((d: any) => `  ${d.status || 'unknown'}: ${d.count}건`)
              .join('\n');
            contextParts.push(`[배포 단계별 분포]\n${statusLines}`);
          }
          const demoTimeline = await dashboardService.getDemoTimeline();
          if (demoTimeline.length > 0) {
            const demoLines = demoTimeline.slice(0, 5)
              .map((d: any) => `  ${d.robotName} (${d.companyName}) — ${d.demoEvent || '시연'} @ ${d.demoDate || '날짜 미상'}`)
              .join('\n');
            contextParts.push(`[최근 시연/배포 이벤트]\n${demoLines}`);
          }
          break;
        }
        case 'humanoid_trend': {
          const pocScores = await humanoidTrendService.getPocScores();
          if (pocScores.length > 0) {
            const top5 = pocScores
              .sort((a: any, b: any) => b.averageScore - a.averageScore)
              .slice(0, 5);
            const pocLines = top5
              .map((s: any) => `  ${s.robotName} (${s.companyName}): 평균 ${s.averageScore}/10 [페이로드${s.payloadScore} 운용${s.operationTimeScore} 핑거${s.fingerDofScore} 폼팩터${s.formFactorScore} PoC배포${s.pocDeploymentScore} 가성비${s.costEfficiencyScore}]`)
              .join('\n');
            contextParts.push(`[PoC 역량 TOP 5]\n${pocLines}`);
          }
          const rfmScores = await humanoidTrendService.getRfmScores();
          if (rfmScores.length > 0) {
            const rfmLines = rfmScores.slice(0, 5)
              .map((s: any) => `  ${s.robotName} — ${s.rfmModelName}: 아키텍처${s.architectureScore} 데이터${s.dataScore} 추론${s.inferenceScore} 오픈소스${s.openSourceScore} 상용${s.maturityScore}`)
              .join('\n');
            contextParts.push(`[RFM 역량 TOP 5]\n${rfmLines}`);
          }
          break;
        }
      }
    } catch { /* 템플릿별 심화 데이터 수집 실패 시 기본 데이터만 사용 */ }

    return contextParts.join('\n\n');
  }

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
      const context = await this.collectTemplateContext(options.template);
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const templateLabels: Record<string, string> = {
        market_overview: '시장 현황',
        company_deep_dive: '기업 심층 분석',
        tech_components: '기술 부품 동향',
        use_case: '적용 사례',
        humanoid_trend: '휴머노이드 동향',
      };

      const prompt = `당신은 휴머노이드 로봇 산업 전문 분석가입니다. 경영진 보고용 파워포인트의 "${templateLabels[options.template] || options.template}" 리포트에 대한 전략 코멘터리를 한국어로 작성하세요.

${context}

아래 3개 섹션으로 구분하여 작성하세요. 각 섹션 제목을 포함하고, 데이터에 근거한 구체적 수치를 인용하세요.

[핵심 인사이트]
- 위 데이터에서 도출되는 가장 중요한 발견 2~3가지 (각 1~2문장)

[시장 동향 및 경쟁 구도]
- 지역/기업/기술 측면의 트렌드 2가지 (각 1~2문장)

[리스크 & 기회]
- 주의해야 할 위협 1가지, 포착 가능한 기회 1가지 (각 1문장)

총 400자 내외로 작성하세요. 추상적 표현 없이, 데이터 기반의 구체적인 분석만 포함하세요.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      const commentary = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      // 사용량 기록
      aiUsageService.logUsage({
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        webSearch: false,
        inputTokens: response.usage?.input_tokens ?? Math.ceil(prompt.length / 3),
        outputTokens: response.usage?.output_tokens ?? Math.ceil(commentary.length / 3),
        query: `PPT AI Commentary: ${options.template}`,
      }).catch(() => {});

      if (commentary) {
        // 섹션별로 분리하여 2장의 슬라이드에 배치
        const sections = commentary.split(/\[(.+?)\]/g).filter(Boolean);
        const parsedSections: { title: string; body: string }[] = [];
        for (let i = 0; i < sections.length - 1; i += 2) {
          const title = sections[i]!.trim();
          const body = sections[i + 1]?.trim() || '';
          if (body) parsedSections.push({ title, body });
        }

        if (parsedSections.length >= 2) {
          // 슬라이드 1: 핵심 인사이트 + 시장 동향
          const slide1 = this.addSectionSlide(pptx, 'AI 전략 코멘터리 (1/2)', theme);
          let yPos = 1.2;
          for (const section of parsedSections.slice(0, 2)) {
            slide1.addText(section.title, {
              x: 0.8, y: yPos, w: '90%', h: 0.4,
              fontSize: 15, fontFace: 'Arial', color: theme.accentColor, bold: true,
            });
            slide1.addText(section.body, {
              x: 0.8, y: yPos + 0.4, w: '90%', h: 1.6,
              fontSize: 13, fontFace: 'Arial', color: theme.textColor,
              valign: 'top', wrap: true, lineSpacingMultiple: 1.4,
            });
            yPos += 2.2;
          }
          slide1.addText('* Claude AI 기반 자동 생성 코멘터리', {
            x: 0.8, y: 5.2, w: '90%', fontSize: 9, color: theme.subtitleColor, italic: true,
          });

          // 슬라이드 2: 리스크 & 기회
          if (parsedSections.length >= 3) {
            const slide2 = this.addSectionSlide(pptx, 'AI 전략 코멘터리 (2/2)', theme);
            const riskSection = parsedSections[2]!;
            slide2.addText(riskSection.title, {
              x: 0.8, y: 1.2, w: '90%', h: 0.4,
              fontSize: 15, fontFace: 'Arial', color: theme.accentColor, bold: true,
            });
            slide2.addText(riskSection.body, {
              x: 0.8, y: 1.6, w: '90%', h: 3.0,
              fontSize: 13, fontFace: 'Arial', color: theme.textColor,
              valign: 'top', wrap: true, lineSpacingMultiple: 1.4,
            });
            slide2.addText('* Claude AI 기반 자동 생성 코멘터리', {
              x: 0.8, y: 5.2, w: '90%', fontSize: 9, color: theme.subtitleColor, italic: true,
            });
          }
        } else {
          // 파싱 실패 시 단일 슬라이드 폴백
          const slide = this.addSectionSlide(pptx, 'AI 전략 코멘터리', theme);
          slide.addText(commentary, {
            x: 0.8, y: 1.3, w: '90%', h: 3.5,
            fontSize: 13, fontFace: 'Arial', color: theme.textColor,
            valign: 'top', wrap: true, lineSpacingMultiple: 1.4,
          });
          slide.addText('* Claude AI 기반 자동 생성 코멘터리', {
            x: 0.8, y: 5.0, w: '90%', fontSize: 9, color: theme.subtitleColor, italic: true,
          });
        }
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
      { id: 'humanoid_trend', name: '휴머노이드 동향 리포트', description: '휴머노이드 로봇 산업 경쟁 인텔리전스 차트 6종 리포트' },
    ];
  }
}

export const pptGeneratorService = new PPTGeneratorService();
