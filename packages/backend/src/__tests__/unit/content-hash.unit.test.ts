/**
 * Content Hash Unit Tests
 * 
 * Tests for content hash generation and consistency.
 * 
 * Validates: Requirements 2.4, 2.5 (Content Hash Consistency)
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Content hash generation function (same as in article.service.ts)
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('Content Hash Unit Tests', () => {
  describe('Property 6: Content Hash Consistency', () => {
    it('should produce same hash for same content', () => {
      const content = 'This is test content for hashing';
      
      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);
      const hash3 = generateContentHash(content);
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should produce different hash for different content', () => {
      const content1 = 'First content';
      const content2 = 'Second content';
      
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be case sensitive', () => {
      const content1 = 'Test Content';
      const content2 = 'test content';
      
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be whitespace sensitive', () => {
      const content1 = 'Test Content';
      const content2 = 'Test  Content';
      const content3 = 'Test Content ';
      
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      const hash3 = generateContentHash(content3);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should produce 64 character hex string', () => {
      const content = 'Any content';
      const hash = generateContentHash(content);
      
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty string', () => {
      const hash = generateContentHash('');
      
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle unicode content', () => {
      const content1 = '한국어 콘텐츠';
      const content2 = '日本語コンテンツ';
      const content3 = '🤖 Robot Content';
      
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      const hash3 = generateContentHash(content3);
      
      // All should produce valid hashes
      expect(hash1.length).toBe(64);
      expect(hash2.length).toBe(64);
      expect(hash3.length).toBe(64);
      
      // All should be different
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(100000);
      const hash = generateContentHash(longContent);
      
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle special characters', () => {
      const content = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const hash = generateContentHash(content);
      
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('Hash Determinism', () => {
    it('should produce deterministic results across multiple calls', () => {
      const content = 'Deterministic test content';
      const hashes: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        hashes.push(generateContentHash(content));
      }
      
      // All hashes should be identical
      const firstHash = hashes[0];
      expect(hashes.every(h => h === firstHash)).toBe(true);
    });
  });
});
