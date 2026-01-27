import { companyService } from './company.service.js';
import { productService } from './product.service.js';
import { articleService } from './article.service.js';
import type { Company, Product, Article, ProductSpec } from '../types/index.js';
import type { CompanyFiltersDto, ProductFiltersDto, ArticleFiltersDto, PaginationDto } from '../types/dto.js';

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
}

export class ExportService {
  /**
   * Export companies to CSV
   */
  async exportCompanies(
    filters: CompanyFiltersDto = {},
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<string> {
    const pagination: PaginationDto = { page: 1, pageSize: 1000, sortOrder: 'desc' };
    const result = await companyService.list(filters, pagination);
    
    if (options.format === 'json') {
      return JSON.stringify(result.items, null, 2);
    }

    return this.companiesToCsv(result.items, options.includeHeaders);
  }

  /**
   * Export products to CSV
   */
  async exportProducts(
    filters: ProductFiltersDto = {},
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<string> {
    const pagination: PaginationDto = { page: 1, pageSize: 1000, sortOrder: 'desc' };
    const result = await productService.list(filters, pagination);
    
    if (options.format === 'json') {
      return JSON.stringify(result.items, null, 2);
    }

    return this.productsToCsv(result.items, options.includeHeaders);
  }

  /**
   * Export articles to CSV
   */
  async exportArticles(
    filters: ArticleFiltersDto = {},
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<string> {
    const pagination: PaginationDto = { page: 1, pageSize: 1000, sortOrder: 'desc' };
    const result = await articleService.list(filters, pagination);
    
    if (options.format === 'json') {
      return JSON.stringify(result.items, null, 2);
    }

    return this.articlesToCsv(result.items, options.includeHeaders);
  }

  /**
   * Export products with specs to CSV
   */
  async exportProductsWithSpecs(
    filters: ProductFiltersDto = {},
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<string> {
    const pagination: PaginationDto = { page: 1, pageSize: 1000, sortOrder: 'desc' };
    const result = await productService.list(filters, pagination);
    
    // Get specs for each product
    const productsWithSpecs: (Product & { spec?: ProductSpec })[] = [];
    for (const product of result.items) {
      const details = await productService.getWithDetails(product.id);
      productsWithSpecs.push({
        ...product,
        spec: details?.spec || undefined,
      });
    }

    if (options.format === 'json') {
      return JSON.stringify(productsWithSpecs, null, 2);
    }

    return this.productsWithSpecsToCsv(productsWithSpecs, options.includeHeaders);
  }

  private companiesToCsv(companies: Company[], includeHeaders = true): string {
    const headers = ['ID', 'Name', 'Country', 'Category', 'Homepage URL', 'Description', 'Created At'];
    const rows = companies.map(c => [
      c.id,
      this.escapeCsv(c.name),
      c.country,
      c.category,
      c.homepageUrl || '',
      this.escapeCsv(c.description || ''),
      c.createdAt.toISOString(),
    ]);

    return this.buildCsv(headers, rows, includeHeaders);
  }

  private productsToCsv(products: Product[], includeHeaders = true): string {
    const headers = ['ID', 'Company ID', 'Name', 'Series', 'Type', 'Release Date', 'Target Market', 'Status', 'Created At'];
    const rows = products.map(p => [
      p.id,
      p.companyId,
      this.escapeCsv(p.name),
      p.series || '',
      p.type,
      p.releaseDate || '',
      this.escapeCsv(p.targetMarket || ''),
      p.status,
      p.createdAt.toISOString(),
    ]);

    return this.buildCsv(headers, rows, includeHeaders);
  }

  private productsWithSpecsToCsv(
    products: (Product & { spec?: ProductSpec })[],
    includeHeaders = true
  ): string {
    const headers = [
      'ID', 'Company ID', 'Name', 'Series', 'Type', 'Release Date', 'Target Market', 'Status',
      'DOF', 'Payload (kg)', 'Speed (m/s)', 'Battery (min)', 'Price Min', 'Price Max', 'Currency',
      'OS', 'SDK', 'Control Architecture',
    ];
    
    const rows = products.map(p => [
      p.id,
      p.companyId,
      this.escapeCsv(p.name),
      p.series || '',
      p.type,
      p.releaseDate || '',
      this.escapeCsv(p.targetMarket || ''),
      p.status,
      p.spec?.dof?.toString() || '',
      p.spec?.payloadKg || '',
      p.spec?.speedMps || '',
      p.spec?.batteryMinutes?.toString() || '',
      p.spec?.priceMin || '',
      p.spec?.priceMax || '',
      p.spec?.priceCurrency || '',
      p.spec?.os || '',
      p.spec?.sdk || '',
      p.spec?.controlArchitecture || '',
    ]);

    return this.buildCsv(headers, rows, includeHeaders);
  }

  private articlesToCsv(articles: Article[], includeHeaders = true): string {
    const headers = ['ID', 'Title', 'Source', 'URL', 'Published At', 'Language', 'Company ID', 'Product ID', 'Summary'];
    const rows = articles.map(a => [
      a.id,
      this.escapeCsv(a.title),
      a.source,
      a.url,
      a.publishedAt?.toISOString() || '',
      a.language,
      a.companyId || '',
      a.productId || '',
      this.escapeCsv(a.summary || ''),
    ]);

    return this.buildCsv(headers, rows, includeHeaders);
  }

  private buildCsv(headers: string[], rows: string[][], includeHeaders: boolean): string {
    const lines: string[] = [];
    
    if (includeHeaders) {
      lines.push(headers.join(','));
    }
    
    for (const row of rows) {
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate a simple HTML report
   */
  async generateReport(options: {
    title: string;
    sections: Array<{
      title: string;
      type: 'companies' | 'products' | 'articles';
      filters?: Record<string, unknown>;
    }>;
    theme?: 'light' | 'dark';
  }): Promise<string> {
    const { title, sections, theme = 'light' } = options;
    
    const bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const textColor = theme === 'dark' ? '#eaeaea' : '#333333';
    const borderColor = theme === 'dark' ? '#444' : '#ddd';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: ${bgColor}; color: ${textColor}; padding: 20px; }
    h1 { border-bottom: 2px solid ${borderColor}; padding-bottom: 10px; }
    h2 { margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid ${borderColor}; padding: 8px; text-align: left; }
    th { background: ${theme === 'dark' ? '#2a2a4e' : '#f5f5f5'}; }
    .summary { background: ${theme === 'dark' ? '#2a2a4e' : '#f9f9f9'}; padding: 15px; border-radius: 5px; margin: 20px 0; }
    @media print { body { background: white; color: black; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="summary">
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
`;

    for (const section of sections) {
      html += `<h2>${section.title}</h2>`;
      
      if (section.type === 'companies') {
        const result = await companyService.list(section.filters as CompanyFiltersDto || {}, { page: 1, pageSize: 100, sortOrder: 'desc' });
        html += this.companiesToHtmlTable(result.items);
      } else if (section.type === 'products') {
        const result = await productService.list(section.filters as ProductFiltersDto || {}, { page: 1, pageSize: 100, sortOrder: 'desc' });
        html += this.productsToHtmlTable(result.items);
      } else if (section.type === 'articles') {
        const result = await articleService.list(section.filters as ArticleFiltersDto || {}, { page: 1, pageSize: 100, sortOrder: 'desc' });
        html += this.articlesToHtmlTable(result.items);
      }
    }

    html += '</body></html>';
    return html;
  }

  private companiesToHtmlTable(companies: Company[]): string {
    return `
<table>
  <thead>
    <tr><th>Name</th><th>Country</th><th>Category</th><th>Description</th></tr>
  </thead>
  <tbody>
    ${companies.map(c => `
    <tr>
      <td>${this.escapeHtml(c.name)}</td>
      <td>${c.country}</td>
      <td>${c.category}</td>
      <td>${this.escapeHtml(c.description || '')}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  private productsToHtmlTable(products: Product[]): string {
    return `
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Release Date</th><th>Status</th><th>Target Market</th></tr>
  </thead>
  <tbody>
    ${products.map(p => `
    <tr>
      <td>${this.escapeHtml(p.name)}</td>
      <td>${p.type}</td>
      <td>${p.releaseDate || '-'}</td>
      <td>${p.status}</td>
      <td>${this.escapeHtml(p.targetMarket || '')}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  private articlesToHtmlTable(articles: Article[]): string {
    return `
<table>
  <thead>
    <tr><th>Title</th><th>Source</th><th>Published</th><th>Language</th></tr>
  </thead>
  <tbody>
    ${articles.map(a => `
    <tr>
      <td>${this.escapeHtml(a.title)}</td>
      <td>${a.source}</td>
      <td>${a.publishedAt?.toISOString().split('T')[0] || '-'}</td>
      <td>${a.language}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const exportService = new ExportService();
