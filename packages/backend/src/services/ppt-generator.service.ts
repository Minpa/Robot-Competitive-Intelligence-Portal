import { companyService } from './company.service.js';
import { productService } from './product.service.js';
import { dashboardService } from './dashboard.service.js';

export type PPTTemplate = 'market_overview' | 'company_deep_dive' | 'tech_components' | 'use_case';
export type PPTTheme = 'light' | 'dark';

export interface SlideContent {
  type: 'title' | 'text' | 'table' | 'chart' | 'image';
  title?: string;
  content?: string | string[][] | Record<string, unknown>;
}

export interface PPTSlide {
  id: string;
  title: string;
  subtitle?: string;
  contents: SlideContent[];
}

export interface PPTGenerationOptions {
  template: PPTTemplate;
  theme: PPTTheme;
  title: string;
  subtitle?: string;
  companyIds?: string[];
  robotIds?: string[];
  includeCharts?: boolean;
  includeTables?: boolean;
}

export interface PPTGenerationResult {
  slides: PPTSlide[];
  metadata: {
    template: PPTTemplate;
    theme: PPTTheme;
    generatedAt: string;
    slideCount: number;
  };
}

export class PPTGeneratorService {
  /**
   * Generate PPT slides based on template
   */
  async generateSlides(options: PPTGenerationOptions): Promise<PPTGenerationResult> {
    const slides: PPTSlide[] = [];

    // Title slide
    slides.push({
      id: 'title',
      title: options.title,
      subtitle: options.subtitle || new Date().toLocaleDateString('ko-KR'),
      contents: [{
        type: 'title',
        title: options.title,
        content: options.subtitle,
      }],
    });

    switch (options.template) {
      case 'market_overview':
        slides.push(...await this.generateMarketOverviewSlides(options));
        break;
      case 'company_deep_dive':
        slides.push(...await this.generateCompanyDeepDiveSlides(options));
        break;
      case 'tech_components':
        slides.push(...await this.generateTechComponentsSlides(options));
        break;
      case 'use_case':
        slides.push(...await this.generateUseCaseSlides(options));
        break;
    }

    return {
      slides,
      metadata: {
        template: options.template,
        theme: options.theme,
        generatedAt: new Date().toISOString(),
        slideCount: slides.length,
      },
    };
  }

  private async generateMarketOverviewSlides(options: PPTGenerationOptions): Promise<PPTSlide[]> {
    const slides: PPTSlide[] = [];
    const summary = await dashboardService.getSummary();
    const robotSummary = await dashboardService.getRobotSummary();

    // Summary slide
    slides.push({
      id: 'summary',
      title: '시장 현황 요약',
      contents: [{
        type: 'table',
        content: [
          ['지표', '수치'],
          ['총 회사 수', String(summary.totalCompanies)],
          ['총 제품 수', String(summary.totalProducts)],
          ['총 로봇 수', String(summary.totalRobots)],
          ['총 기사 수', String(summary.totalArticles)],
          ['주간 신규 제품', String(summary.weeklyNewProducts)],
          ['주간 신규 기사', String(summary.weeklyNewArticles)],
        ],
      }],
    });

    // Segment matrix slide
    if (options.includeCharts) {
      const segmentMatrix = await dashboardService.getSegmentMatrix();
      slides.push({
        id: 'segment-matrix',
        title: '세그먼트 매트릭스',
        subtitle: 'Locomotion × Purpose',
        contents: [{
          type: 'chart',
          title: '세그먼트별 로봇 분포',
          content: segmentMatrix,
        }],
      });
    }

    // Region distribution slide
    slides.push({
      id: 'region-distribution',
      title: '지역별 분포',
      contents: [{
        type: 'table',
        content: [
          ['지역', '로봇 수'],
          ...Object.entries(robotSummary.byRegion).map(([region, count]) => [region, String(count)]),
        ],
      }],
    });

    // Purpose distribution slide
    slides.push({
      id: 'purpose-distribution',
      title: '용도별 분포',
      contents: [{
        type: 'table',
        content: [
          ['용도', '로봇 수'],
          ...Object.entries(robotSummary.byPurpose).map(([purpose, count]) => [purpose, String(count)]),
        ],
      }],
    });

    return slides;
  }

  private async generateCompanyDeepDiveSlides(options: PPTGenerationOptions): Promise<PPTSlide[]> {
    const slides: PPTSlide[] = [];

    if (!options.companyIds || options.companyIds.length === 0) {
      // Get top companies
      const companies = await companyService.list({}, { page: 1, pageSize: 5, sortOrder: 'desc' });
      options.companyIds = companies.items.map(c => c.id);
    }

    for (const companyId of options.companyIds) {
      const company = await companyService.getById(companyId);
      if (!company) continue;

      // Company overview slide
      slides.push({
        id: `company-${companyId}`,
        title: company.name,
        subtitle: `${company.country} | ${company.category}`,
        contents: [
          {
            type: 'text',
            content: company.description || '회사 설명 없음',
          },
          {
            type: 'table',
            content: [
              ['항목', '정보'],
              ['국가', company.country],
              ['카테고리', company.category],
              ['홈페이지', company.homepageUrl || '-'],
            ],
          },
        ],
      });

      // Company products slide
      const products = await productService.list({ companyId }, { page: 1, pageSize: 10, sortOrder: 'desc' });
      if (products.items.length > 0) {
        slides.push({
          id: `company-${companyId}-products`,
          title: `${company.name} 제품`,
          contents: [{
            type: 'table',
            content: [
              ['제품명', '유형', '출시일', '상태'],
              ...products.items.map(p => [p.name, p.type, p.releaseDate || '-', p.status]),
            ],
          }],
        });
      }
    }

    return slides;
  }

  private async generateTechComponentsSlides(_options: PPTGenerationOptions): Promise<PPTSlide[]> {
    const slides: PPTSlide[] = [];

    // Get product timelines
    const rfmTimeline = await dashboardService.getRfmTimeline();
    const actuatorTimeline = await dashboardService.getActuatorTimeline();
    const socTimeline = await dashboardService.getSocTimeline();

    // RFM slide
    if (rfmTimeline.length > 0) {
      slides.push({
        id: 'rfm-timeline',
        title: 'Robot Foundation Models',
        contents: [{
          type: 'table',
          content: [
            ['모델명', '회사', '출시일'],
            ...rfmTimeline.slice(0, 10).map(r => [r.name, r.companyName, r.releaseDate || '-']),
          ],
        }],
      });
    }

    // Actuator slide
    if (actuatorTimeline.length > 0) {
      slides.push({
        id: 'actuator-timeline',
        title: '액츄에이터',
        contents: [{
          type: 'table',
          content: [
            ['제품명', '회사', '출시일'],
            ...actuatorTimeline.slice(0, 10).map(a => [a.name, a.companyName, a.releaseDate || '-']),
          ],
        }],
      });
    }

    // SoC slide
    if (socTimeline.length > 0) {
      slides.push({
        id: 'soc-timeline',
        title: 'SoC / AI 칩',
        contents: [{
          type: 'table',
          content: [
            ['제품명', '회사', '출시일'],
            ...socTimeline.slice(0, 10).map(s => [s.name, s.companyName, s.releaseDate || '-']),
          ],
        }],
      });
    }

    return slides;
  }

  private async generateUseCaseSlides(_options: PPTGenerationOptions): Promise<PPTSlide[]> {
    const slides: PPTSlide[] = [];

    // Environment-Task Matrix
    const matrix = await dashboardService.getEnvironmentTaskMatrix();
    slides.push({
      id: 'env-task-matrix',
      title: '환경-작업 매트릭스',
      contents: [{
        type: 'chart',
        title: '적용 환경별 작업 유형 분포',
        content: matrix,
      }],
    });

    // Deployment status
    const deploymentStatus = await dashboardService.getDeploymentStatusDistribution();
    slides.push({
      id: 'deployment-status',
      title: '배포 상태 분포',
      contents: [{
        type: 'table',
        content: [
          ['상태', '건수'],
          ...deploymentStatus.map(d => [d.status || 'Unknown', String(d.count)]),
        ],
      }],
    });

    // Demo timeline
    const demoTimeline = await dashboardService.getDemoTimeline();
    if (demoTimeline.length > 0) {
      slides.push({
        id: 'demo-timeline',
        title: '최근 시연 이벤트',
        contents: [{
          type: 'table',
          content: [
            ['날짜', '로봇', '회사', '이벤트'],
            ...demoTimeline.slice(0, 10).map(d => [
              d.demoDate || '-',
              d.robotName || '-',
              d.companyName || '-',
              d.demoEvent || '-',
            ]),
          ],
        }],
      });
    }

    return slides;
  }

  /**
   * Get available templates
   */
  getTemplates(): { id: PPTTemplate; name: string; description: string }[] {
    return [
      { id: 'market_overview', name: 'Market Overview', description: '시장 현황 및 트렌드 요약' },
      { id: 'company_deep_dive', name: 'Company Deep Dive', description: '특정 회사 심층 분석' },
      { id: 'tech_components', name: 'Tech Components', description: '기술 부품 동향 분석' },
      { id: 'use_case', name: 'Use Case', description: '적용 사례 및 시연 분석' },
    ];
  }
}

export const pptGeneratorService = new PPTGeneratorService();
