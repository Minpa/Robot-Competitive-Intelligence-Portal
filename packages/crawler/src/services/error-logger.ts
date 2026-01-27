import type { CrawlError } from '../types.js';

export interface ErrorLogEntry {
  id: string;
  jobId?: string;
  url: string;
  errorType: CrawlError['errorType'];
  message: string;
  stackTrace?: string;
  occurredAt: Date;
}

export class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxErrors: number = 10000;

  /**
   * Log a crawl error
   * Property 17: Error Logging Completeness - all required fields present
   */
  logError(error: CrawlError, jobId?: string): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      url: error.url,
      errorType: error.errorType,
      message: error.message,
      occurredAt: error.timestamp,
    };

    // Validate required fields
    if (!entry.url || !entry.errorType || !entry.message || !entry.occurredAt) {
      console.error('[ErrorLogger] Invalid error entry - missing required fields');
    }

    this.errors.push(entry);

    // Trim old errors if exceeding max
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    console.error(
      `[ErrorLogger] ${entry.errorType.toUpperCase()} - ${entry.url}: ${entry.message}`
    );

    return entry;
  }

  /**
   * Log multiple errors from a job result
   */
  logJobErrors(errors: CrawlError[], jobId: string): ErrorLogEntry[] {
    return errors.map((error) => this.logError(error, jobId));
  }

  /**
   * Get errors with optional filtering
   */
  getErrors(filters?: {
    jobId?: string;
    errorType?: CrawlError['errorType'];
    since?: Date;
    limit?: number;
  }): ErrorLogEntry[] {
    let result = [...this.errors];

    if (filters?.jobId) {
      result = result.filter((e) => e.jobId === filters.jobId);
    }

    if (filters?.errorType) {
      result = result.filter((e) => e.errorType === filters.errorType);
    }

    if (filters?.since) {
      result = result.filter((e) => e.occurredAt >= filters.since!);
    }

    // Sort by most recent first
    result.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    last24Hours: number;
    lastHour: number;
  } {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    const byType: Record<string, number> = {};
    let last24Hours = 0;
    let lastHour = 0;

    for (const error of this.errors) {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1;

      if (error.occurredAt >= dayAgo) {
        last24Hours++;
      }
      if (error.occurredAt >= hourAgo) {
        lastHour++;
      }
    }

    return {
      total: this.errors.length,
      byType,
      last24Hours,
      lastHour,
    };
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }
}

export const errorLogger = new ErrorLogger();
