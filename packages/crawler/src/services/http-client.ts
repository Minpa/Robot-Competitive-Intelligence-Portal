import axios, { AxiosInstance, AxiosError } from 'axios';
import type { RateLimitConfig } from '../types.js';

export class HttpClient {
  private client: AxiosInstance;
  private requestCounts: Map<string, { minute: number[]; hour: number[] }> = new Map();
  private rateLimit: RateLimitConfig;

  constructor(timeout: number = 30000, rateLimit?: RateLimitConfig) {
    this.client = axios.create({
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    this.rateLimit = rateLimit || {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      delayBetweenRequests: 2000,
    };
  }

  async fetch(url: string, retryCount: number = 3): Promise<string> {
    const domain = new URL(url).hostname;

    // Check rate limit
    await this.checkRateLimit(domain);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Record request
        this.recordRequest(domain);

        // Add delay between requests
        if (attempt > 0) {
          await this.delay(this.rateLimit.delayBetweenRequests * Math.pow(2, attempt));
        }

        const response = await this.client.get(url);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        // Don't retry on 4xx errors (except 429)
        if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          if (axiosError.response.status === 429) {
            // Rate limited - wait longer
            await this.delay(60000);
            continue;
          }
          throw error;
        }

        console.log(`Retry ${attempt + 1}/${retryCount} for ${url}: ${(error as Error).message}`);
      }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${retryCount} retries`);
  }

  private async checkRateLimit(domain: string): Promise<void> {
    const now = Date.now();
    const counts = this.requestCounts.get(domain) || { minute: [], hour: [] };

    // Clean old entries
    counts.minute = counts.minute.filter((t) => now - t < 60000);
    counts.hour = counts.hour.filter((t) => now - t < 3600000);

    // Check limits
    if (counts.minute.length >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - (now - counts.minute[0]!);
      console.log(`Rate limit (minute) reached for ${domain}, waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }

    if (counts.hour.length >= this.rateLimit.requestsPerHour) {
      const waitTime = 3600000 - (now - counts.hour[0]!);
      console.log(`Rate limit (hour) reached for ${domain}, waiting ${waitTime}ms`);
      await this.delay(Math.min(waitTime, 300000)); // Max 5 min wait
    }

    this.requestCounts.set(domain, counts);
  }

  private recordRequest(domain: string): void {
    const now = Date.now();
    const counts = this.requestCounts.get(domain) || { minute: [], hour: [] };
    counts.minute.push(now);
    counts.hour.push(now);
    this.requestCounts.set(domain, counts);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setRateLimit(config: RateLimitConfig): void {
    this.rateLimit = config;
  }
}

export const httpClient = new HttpClient();
