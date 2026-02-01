const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
}

export const api = new ApiClient();
