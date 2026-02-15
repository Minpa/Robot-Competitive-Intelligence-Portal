// Remove trailing /api if present (Railway may add it automatically)
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async register(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    this.setToken(null);
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // 허용된 이메일 관리
  async getAllowedEmails() {
    return this.request<{ emails: { id: string; email: string; note: string | null; createdAt: string }[] }>('/auth/allowed-emails');
  }

  async addAllowedEmail(email: string, note?: string) {
    return this.request<{ success: boolean; message: string }>('/auth/allowed-emails', {
      method: 'POST',
      body: JSON.stringify({ email, note }),
    });
  }

  async removeAllowedEmail(email: string) {
    return this.request<{ success: boolean; message: string }>(`/auth/allowed-emails/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  }

  // Companies
  async getCompanies(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ items: any[]; total: number }>(`/companies${query}`);
  }

  async getCompany(id: string) {
    return this.request<any>(`/companies/${id}`);
  }

  // Products
  async getProducts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ items: any[]; total: number }>(`/products${query}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async getProductDetails(id: string) {
    return this.request<any>(`/products/${id}/details`);
  }

  async getProductTimeline(id: string) {
    return this.request<any[]>(`/products/${id}/timeline`);
  }

  // Articles
  async getArticles(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ items: any[]; total: number }>(`/articles${query}`);
  }

  async getArticle(id: string) {
    return this.request<any>(`/articles/${id}`);
  }

  // Keywords
  async getKeywords(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ items: any[]; total: number }>(`/keywords${query}`);
  }

  async getTrendingKeywords() {
    return this.request<any[]>('/keywords/trending');
  }

  // Search
  async search(query: string) {
    return this.request<any>(`/search?q=${encodeURIComponent(query)}`);
  }

  async autocomplete(prefix: string) {
    return this.request<any[]>(`/search/autocomplete?prefix=${encodeURIComponent(prefix)}`);
  }

  // Dashboard
  async getDashboardSummary() {
    return this.request<any>('/dashboard/summary');
  }

  async getWeeklyHighlights() {
    return this.request<{
      periodStart: string;
      periodEnd: string;
      categories: {
        product: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        technology: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        industry: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        other: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
      };
      productTypes: {
        robot: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        rfm: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        soc: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
        actuator: Array<{ id: string; title: string; summary: string; source: string; url: string; publishedAt: string | null }>;
      };
    }>('/dashboard/highlights');
  }

  async getTimeline(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/dashboard/timeline${query}`);
  }

  async getArticleChartData() {
    return this.request<any>('/dashboard/charts/articles');
  }

  async getProductTypeChartData() {
    return this.request<any>('/dashboard/charts/product-types');
  }

  async getProductReleaseTimeline() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      releaseDate: string | null;
      companyName: string;
    }>>('/dashboard/product-timeline');
  }

  async getRfmTimeline() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      releaseDate: string | null;
      companyName: string;
    }>>('/dashboard/rfm-timeline');
  }

  async getActuatorTimeline() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      releaseDate: string | null;
      companyName: string;
    }>>('/dashboard/actuator-timeline');
  }

  async getSocTimeline() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      releaseDate: string | null;
      companyName: string;
    }>>('/dashboard/soc-timeline');
  }

  // Export
  async exportCompanies(format: 'csv' | 'json' = 'csv') {
    return this.request<string>(`/export/companies?format=${format}`);
  }

  async exportProducts(format: 'csv' | 'json' = 'csv', includeSpecs = false) {
    return this.request<string>(`/export/products?format=${format}&includeSpecs=${includeSpecs}`);
  }

  async exportArticles(format: 'csv' | 'json' = 'csv') {
    return this.request<string>(`/export/articles?format=${format}`);
  }

  // Admin
  async getCrawlTargets() {
    return this.request<any[]>('/admin/crawl-targets');
  }

  async getCrawlErrors() {
    return this.request<{ items: any[]; total: number }>('/admin/crawl-errors');
  }

  async getCrawlJobs() {
    return this.request<{ items: any[]; total: number }>('/admin/crawl-jobs');
  }

  async triggerCrawl(targetId: string) {
    return this.request<any>(`/admin/crawl-targets/${targetId}/trigger`, { 
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async addCrawlTarget(data: { domain: string; urls: string[] }) {
    return this.request<any>('/admin/crawl-targets', {
      method: 'POST',
      body: JSON.stringify({
        domain: data.domain,
        urls: data.urls,
        cronExpression: '0 0 * * *',
        enabled: true,
      }),
    });
  }

  async deleteCrawlTarget(targetId: string) {
    return this.request<void>(`/admin/crawl-targets/${targetId}`, {
      method: 'DELETE',
    });
  }

  async enableCrawlTarget(targetId: string) {
    return this.request<any>(`/admin/crawl-targets/${targetId}/enable`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async disableCrawlTarget(targetId: string) {
    return this.request<any>(`/admin/crawl-targets/${targetId}/disable`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async triggerAllCrawls() {
    return this.request<{ triggered: number; targets: string[] }>('/admin/crawl-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getAiAnalysisStatus() {
    return this.request<{ unanalyzedCount: number }>('/admin/ai-analysis/status');
  }

  async getUnanalyzedArticles(limit: number = 50) {
    return this.request<{ articles: Array<{ id: string; title: string; content: string | null }>; count: number }>(
      `/admin/ai-analysis/unanalyzed?limit=${limit}`
    );
  }

  async updateArticleAnalysis(id: string, summary: string, category: string) {
    return this.request<{ success: boolean }>(`/admin/ai-analysis/articles/${id}`, {
      method: 'POST',
      body: JSON.stringify({ summary, category }),
    });
  }

  async runAiAnalysisAll() {
    return this.request<{ success: boolean; analyzed: number; total: number; results: Array<{ id: string; title: string; category: string }> }>(
      '/admin/ai-analysis/analyze-all',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  }

  // Legal Data Collection (합법적 데이터 수집)
  async collectPublicData() {
    return this.request<{
      results: Array<{
        source: string;
        success: boolean;
        count: number;
        items: Array<{
          id: string;
          source: string;
          type: string;
          title: string;
          url: string;
          metadata: Record<string, unknown>;
          collectedAt: string;
        }>;
        error?: string;
      }>;
      totalCount: number;
    }>('/legal/collect-public-data', { method: 'POST' });
  }

  async collectArxiv() {
    return this.request<any>('/legal/arxiv', { method: 'POST' });
  }

  async collectGitHub() {
    return this.request<any>('/legal/github', { method: 'POST' });
  }

  async collectSecEdgar() {
    return this.request<any>('/legal/sec-edgar', { method: 'POST' });
  }

  async collectPatents() {
    return this.request<any>('/legal/patents', { method: 'POST' });
  }

  // Text Analysis (텍스트 분석)
  async analyzeTextPreview(text: string) {
    return this.request<{
      companies: Array<{ name: string; country: string; category: string; description?: string }>;
      products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string }>;
      articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
      keywords: string[];
      summary: string;
    }>('/analyze/preview', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async analyzeAndSave(text: string) {
    return this.request<{
      analyzed: {
        companies: Array<{ name: string; country: string; category: string; description?: string }>;
        products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string }>;
        articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
        keywords: string[];
        summary: string;
      };
      saved: {
        companiesSaved: number;
        productsSaved: number;
        articlesSaved: number;
        keywordsSaved: number;
        errors: string[];
      };
    }>('/analyze/save', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // 이미 파싱된 데이터 직접 저장
  async saveAnalyzedData(data: {
    companies: Array<{ name: string; country: string; category: string; description?: string }>;
    products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string; specs?: Record<string, unknown> }>;
    articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
    keywords: string[];
    summary: string;
  }) {
    return this.request<{
      companiesSaved: number;
      productsSaved: number;
      articlesSaved: number;
      keywordsSaved: number;
      errors: string[];
    }>('/analyze/save-analyzed', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 자동 AI 질의 (GPT-4o에 직접 질의하여 JSON 생성)
  async autoQuery(topic: string, customPrompt?: string) {
    return this.request<{
      companies: Array<{ name: string; country: string; category: string; description?: string }>;
      products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string }>;
      articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
      keywords: string[];
      summary: string;
    }>('/analyze/auto-query', {
      method: 'POST',
      body: JSON.stringify({ topic, customPrompt }),
    });
  }

  // ============================================
  // 휴머노이드 로봇 API
  // ============================================

  // 휴머노이드 로봇 목록
  async getHumanoidRobots(params?: {
    purpose?: string;
    locomotionType?: string;
    handType?: string;
    stage?: string;
    region?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    // Map frontend params to backend params
    const backendParams: Record<string, string> = {};
    if (params) {
      if (params.purpose) backendParams.purpose = params.purpose;
      if (params.locomotionType) backendParams.locomotionType = params.locomotionType;
      if (params.handType) backendParams.handType = params.handType;
      if (params.stage) backendParams.commercializationStage = params.stage; // Map stage to commercializationStage
      if (params.region) backendParams.region = params.region;
      if (params.sortBy) backendParams.sortField = params.sortBy;
      if (params.sortOrder) backendParams.sortDirection = params.sortOrder;
      if (params.page) backendParams.page = String(params.page);
      if (params.limit) backendParams.limit = String(params.limit);
    }
    const query = Object.keys(backendParams).length > 0 ? '?' + new URLSearchParams(backendParams).toString() : '';
    
    const response = await this.request<{ data: any[]; pagination: { total: number; page: number; limit: number } }>(`/humanoid-robots${query}`);
    
    // Transform response to expected format
    return {
      items: response.data.map((item: any) => ({
        id: item.robot.id,
        name: item.robot.name,
        companyName: item.company?.name,
        company: item.company,
        purpose: item.robot.purpose,
        locomotionType: item.robot.locomotionType,
        handType: item.robot.handType,
        stage: item.robot.commercializationStage,
        region: item.robot.region,
        announcedYear: item.robot.announcementYear,
        description: item.robot.description,
        imageUrl: item.robot.imageUrl,
      })),
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
    };
  }

  // 휴머노이드 로봇 상세
  async getHumanoidRobot(id: string) {
    const response = await this.request<any>(`/humanoid-robots/${id}`);
    
    // Transform response to expected format
    return {
      id: response.robot.id,
      name: response.robot.name,
      company: response.company,
      companyName: response.company?.name,
      purpose: response.robot.purpose,
      locomotionType: response.robot.locomotionType,
      handType: response.robot.handType,
      stage: response.robot.commercializationStage,
      region: response.robot.region,
      announcedYear: response.robot.announcementYear,
      description: response.robot.description,
      imageUrl: response.robot.imageUrl,
      bodySpec: response.bodySpec ? {
        height: parseFloat(response.bodySpec.heightCm) || null,
        weight: parseFloat(response.bodySpec.weightKg) || null,
        payload: parseFloat(response.bodySpec.payloadKg) || null,
        dof: response.bodySpec.dofCount,
        maxSpeed: parseFloat(response.bodySpec.maxSpeedMps) || null,
        operationTime: parseFloat(response.bodySpec.operationTimeHours) || null,
      } : null,
      handSpec: response.handSpec ? {
        type: response.handSpec.handType,
        fingerCount: response.handSpec.fingerCount,
        dofPerHand: response.handSpec.handDof,
        maxGripForce: parseFloat(response.handSpec.gripForceN) || null,
        maxTorque: null,
        isModular: response.handSpec.isInterchangeable,
      } : null,
      computingSpec: response.computingSpec ? {
        mainSoc: response.computingSpec.mainSoc,
        topsRange: `${response.computingSpec.topsMin}-${response.computingSpec.topsMax} TOPS`,
        architecture: response.computingSpec.architectureType,
      } : null,
      sensorSpec: response.sensorSpec,
      sensorSpecs: response.sensorSpec ? [response.sensorSpec] : [],
      powerSpec: response.powerSpec ? {
        batteryType: response.powerSpec.batteryType,
        capacity: parseFloat(response.powerSpec.capacityWh) || null,
        operationTime: parseFloat(response.powerSpec.operationTimeHours) || null,
        chargingMethod: response.powerSpec.chargingMethod,
        isSwappable: response.powerSpec.chargingMethod === 'swappable' || response.powerSpec.chargingMethod === 'both',
      } : null,
      applicationCases: (response.applicationCases || []).map((c: any) => ({
        id: c.id,
        title: c.demoEvent || c.taskDescription,
        environment: c.environmentType,
        taskType: c.taskType,
        description: c.taskDescription,
        status: c.deploymentStatus,
        demoDate: c.demoDate,
      })),
      relatedArticles: response.relatedArticles || [],
    };
  }

  // 휴머노이드 로봇 생성
  async createHumanoidRobot(data: any) {
    return this.request<any>('/humanoid-robots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 휴머노이드 로봇 수정
  async updateHumanoidRobot(id: string, data: any) {
    return this.request<any>(`/humanoid-robots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 휴머노이드 로봇 삭제
  async deleteHumanoidRobot(id: string) {
    return this.request<void>(`/humanoid-robots/${id}`, {
      method: 'DELETE',
    });
  }

  // 세그먼트 매트릭스
  async getSegmentMatrix() {
    return this.request<{
      rows: string[];
      columns: string[];
      matrix: Record<string, Record<string, { count: number; robots: Array<{ id: string; name: string }> }>>;
      totalCount: number;
    }>('/humanoid-robots/segment-matrix');
  }

  // Hand 타입 분포
  async getHandTypeDistribution() {
    const response = await this.request<Array<{ handType: string; count: number }>>('/humanoid-robots/hand-distribution');
    const total = response.reduce((sum, item) => sum + item.count, 0);
    return {
      overall: response.map(item => ({
        handType: item.handType,
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      })),
      byPurpose: {},
    };
  }

  // 레이더 차트 데이터
  async getRobotRadarData(id: string) {
    return this.request<{
      robotId: string;
      robotName: string;
      axes: Array<{ axis: string; value: number; maxValue: number }>;
    }>(`/humanoid-robots/${id}/radar`);
  }

  // ============================================
  // 인력 데이터 API
  // ============================================

  // 회사별 인력 데이터
  async getWorkforceData(companyId: string) {
    return this.request<any>(`/workforce/company/${companyId}`);
  }

  // 인력 데이터 생성/수정
  async upsertWorkforceData(companyId: string, data: any) {
    return this.request<any>(`/workforce/company/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 탤런트 트렌드 조회
  async getTalentTrends(companyId: string) {
    return this.request<any[]>(`/workforce/company/${companyId}/trends`);
  }

  // 탤런트 트렌드 조회 (별칭)
  async getTalentTrend(companyId: string) {
    return this.getTalentTrends(companyId);
  }

  // 탤런트 트렌드 추가
  async addTalentTrend(companyId: string, data: any) {
    return this.request<any>(`/workforce/company/${companyId}/trends`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 직무 분포
  async getJobDistribution(companyId: string) {
    return this.request<{
      companyId: string;
      distribution: Array<{ category: string; count: number; percentage: number }>;
    }>(`/workforce/company/${companyId}/job-distribution`);
  }

  // Top N 인력 비교
  async getTopWorkforceComparison(n: number = 10) {
    return this.request<{
      companies: Array<{
        companyId: string;
        companyName: string;
        totalHeadcount: number;
        roboticsHeadcount: number;
        humanoidHeadcount: number;
      }>;
    }>(`/workforce/analytics/top-comparison?n=${n}`);
  }

  // 전체 인력 트렌드
  async getOverallWorkforceTrend() {
    return this.request<{
      trends: Array<{ year: number; totalHeadcount: number; roboticsHeadcount: number }>;
    }>('/workforce/analytics/overall-trend');
  }

  // ============================================
  // 부품 API
  // ============================================

  // 부품 목록
  async getComponents(params?: {
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    const response = await this.request<{ data: any[]; pagination: { total: number } }>(`/components${query}`);
    
    // Transform response
    return {
      items: response.data.map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        vendor: item.vendor,
        specifications: item.specifications,
      })),
      total: response.pagination.total,
    };
  }

  // 부품 상세
  async getComponent(id: string) {
    return this.request<any>(`/components/${id}`);
  }

  // 부품 상세 (별칭)
  async getComponentById(id: string) {
    return this.getComponent(id);
  }

  // 부품별 로봇 조회
  async getRobotsByComponent(componentId: string) {
    return this.request<any[]>(`/components/${componentId}/robots`);
  }

  // 휴머노이드 로봇 상세 (별칭)
  async getHumanoidRobotById(id: string) {
    return this.getHumanoidRobot(id);
  }

  // 부품 생성
  async createComponent(data: any) {
    return this.request<any>('/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 부품 수정
  async updateComponent(id: string, data: any) {
    return this.request<any>(`/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 부품 삭제
  async deleteComponent(id: string) {
    return this.request<void>(`/components/${id}`, {
      method: 'DELETE',
    });
  }

  // 로봇-부품 연결
  async linkRobotComponent(robotId: string, componentId: string, location?: string) {
    return this.request<any>('/components/robot-link', {
      method: 'POST',
      body: JSON.stringify({ robotId, componentId, location }),
    });
  }

  // 로봇-부품 연결 해제
  async unlinkRobotComponent(robotId: string, componentId: string) {
    return this.request<void>(`/components/robot-link/${robotId}/${componentId}`, {
      method: 'DELETE',
    });
  }

  // 토크 밀도 차트 데이터
  async getTorqueDensityChart() {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        company: string;
        torqueDensity: number;
        weight: number;
      }>;
    }>('/components/analytics/torque-density');
  }

  // TOPS 타임라인
  async getTopsTimeline() {
    return this.request<{
      data: Array<{
        year: number;
        avgTops: number;
        maxTops: number;
        components: Array<{ id: string; name: string; tops: number }>;
      }>;
    }>('/components/analytics/tops-timeline');
  }

  // ============================================
  // 적용 사례 API
  // ============================================

  // 적용 사례 목록
  async getApplicationCases(params?: {
    environment?: string;
    taskType?: string;
    deploymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    const response = await this.request<{ data: any[]; pagination: { total: number } }>(`/application-cases${query}`);
    
    // Transform response
    return {
      items: response.data.map((item: any) => ({
        id: item.case.id,
        robotId: item.case.robotId,
        robotName: item.robot?.name,
        companyName: item.company?.name,
        environment: item.case.environmentType,
        taskType: item.case.taskType,
        description: item.case.taskDescription,
        deploymentStatus: item.case.deploymentStatus,
        demoEvent: item.case.demoEvent,
        demoDate: item.case.demoDate,
      })),
      total: response.pagination.total,
    };
  }

  // 적용 사례 상세
  async getApplicationCase(id: string) {
    return this.request<any>(`/application-cases/${id}`);
  }

  // 적용 사례 생성
  async createApplicationCase(data: any) {
    return this.request<any>('/application-cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 적용 사례 수정
  async updateApplicationCase(id: string, data: any) {
    return this.request<any>(`/application-cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 적용 사례 삭제
  async deleteApplicationCase(id: string) {
    return this.request<void>(`/application-cases/${id}`, {
      method: 'DELETE',
    });
  }

  // 환경-작업 매트릭스
  async getEnvironmentTaskMatrix() {
    return this.request<{
      rows: string[];
      columns: string[];
      matrix: Record<string, Record<string, { count: number; robots: string[] }>>;
    }>('/application-cases/matrix');
  }

  // 배포 상태 분포
  async getDeploymentStatusDistribution() {
    return this.request<{
      distribution: Array<{ status: string; count: number; percentage: number }>;
    }>('/application-cases/deployment-distribution');
  }

  // 시연 타임라인
  async getDemoTimeline(params?: { year?: number }) {
    const query = params?.year ? `?year=${params.year}` : '';
    return this.request<{
      events: Array<{
        id: string;
        title: string;
        robotName: string;
        companyName: string;
        eventDate: string;
        location: string;
        description: string;
      }>;
    }>(`/application-cases/timeline${query}`);
  }

  // ============================================
  // 기사 분석 API
  // ============================================

  // 기사 분석 (AI 요약 + 메타데이터 추출)
  async analyzeArticle(content: string, sourceUrl?: string) {
    const response = await this.request<{
      isDuplicate: boolean;
      existingId?: string;
      message?: string;
      analysis?: {
        summary: string;
        keyPoints: string[];
        mentionedCompanies: Array<{
          mentionedName: string;
          matchedEntity: { id: string; name: string };
          confidence: number;
        }>;
        mentionedRobots: Array<{
          mentionedName: string;
          matchedEntity: { id: string; name: string };
          confidence: number;
        }>;
        extractedTechnologies: string[];
        marketInsights: string[];
        keywords: Array<{ term: string; relevance: number }>;
      };
    }>('/article-analyzer/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, sourceUrl }),
    });

    // Transform response to expected format
    if (response.isDuplicate) {
      return {
        isDuplicate: true,
        duplicateArticleId: response.existingId,
        summary: '',
        metadata: { companies: [], products: [], technologies: [], insights: [] },
        suggestedTags: [],
        contentHash: '',
      };
    }

    const analysis = response.analysis;
    return {
      isDuplicate: false,
      summary: analysis?.summary || '',
      metadata: {
        companies: analysis?.mentionedCompanies?.map(c => c.matchedEntity.name) || [],
        products: analysis?.mentionedRobots?.map(r => r.matchedEntity.name) || [],
        technologies: analysis?.extractedTechnologies || [],
        insights: analysis?.marketInsights || [],
      },
      suggestedTags: [
        ...(analysis?.mentionedRobots?.map(r => ({
          type: 'robot' as const,
          id: r.matchedEntity.id,
          name: r.matchedEntity.name,
          confidence: r.confidence,
        })) || []),
        ...(analysis?.mentionedCompanies?.map(c => ({
          type: 'company' as const,
          id: c.matchedEntity.id,
          name: c.matchedEntity.name,
          confidence: c.confidence,
        })) || []),
      ],
      contentHash: '',
    };
  }

  // 분석된 기사 저장
  async saveAnalyzedArticle(data: {
    title: string;
    content: string;
    summary: string;
    sourceUrl?: string;
    metadata: any;
    robotTags: string[];
    companyTags: string[];
  }) {
    return this.request<any>('/article-analyzer/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 중복 검사
  async checkDuplicate(content: string) {
    return this.request<{
      isDuplicate: boolean;
      duplicateArticleId?: string;
      similarity?: number;
    }>('/article-analyzer/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // 로봇별 기사 조회
  async getArticlesByRobot(robotId: string) {
    return this.request<{ items: any[]; total: number }>(`/article-analyzer/robot/${robotId}`);
  }

  // 회사별 기사 조회
  async getArticlesByCompany(companyId: string) {
    return this.request<{ items: any[]; total: number }>(`/article-analyzer/company/${companyId}`);
  }

  // ============================================
  // PPT 생성 API
  // ============================================

  // PPT 템플릿 목록
  async getPPTTemplates() {
    return this.request<Array<{ id: string; name: string; description: string }>>('/export/ppt/templates');
  }

  // PPT 슬라이드 생성
  async generatePPTSlides(options: {
    template: string;
    theme: string;
    title: string;
    subtitle?: string;
    companyIds?: string[];
    robotIds?: string[];
    includeCharts?: boolean;
    includeTables?: boolean;
  }) {
    return this.request<{
      slides: Array<{
        id: string;
        title: string;
        subtitle?: string;
        contents: Array<{
          type: string;
          title?: string;
          content?: any;
        }>;
      }>;
      metadata: {
        template: string;
        theme: string;
        generatedAt: string;
        slideCount: number;
      };
    }>('/export/ppt/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

export const api = new ApiClient();
