
import { CacheService } from '../CacheService';
import { CACHE_TTL } from '../types';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  describe('set and get', () => {
    it('should store and retrieve data correctly', () => {
      const testData = { id: '1', name: 'Test' };
      cacheService.set('test-key', testData);
      
      const retrieved = cacheService.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should respect TTL and expire entries', (done) => {
      const testData = { id: '1', name: 'Test' };
      cacheService.set('test-key', testData, 10); // 10ms TTL
      
      // Should be available immediately
      expect(cacheService.get('test-key')).toEqual(testData);
      
      // Should expire after TTL
      setTimeout(() => {
        expect(cacheService.get('test-key')).toBeNull();
        done();
      }, 15);
    });

    it('should use default TTL when not specified', () => {
      const testData = { id: '1', name: 'Test' };
      cacheService.set('test-key', testData);
      
      // Should be available (default TTL is much longer than test duration)
      expect(cacheService.get('test-key')).toEqual(testData);
    });
  });

  describe('invalidate', () => {
    it('should remove entries matching pattern', () => {
      cacheService.set('user_123_profile', { name: 'User 123' });
      cacheService.set('user_456_profile', { name: 'User 456' });
      cacheService.set('post_789', { title: 'Post 789' });
      
      cacheService.invalidate('user_');
      
      expect(cacheService.get('user_123_profile')).toBeNull();
      expect(cacheService.get('user_456_profile')).toBeNull();
      expect(cacheService.get('post_789')).toEqual({ title: 'Post 789' });
    });

    it('should handle patterns that match no entries', () => {
      cacheService.set('test-key', { data: 'test' });
      
      expect(() => cacheService.invalidate('nonexistent_')).not.toThrow();
      expect(cacheService.get('test-key')).toEqual({ data: 'test' });
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cacheService.set('key1', { data: 'test1' });
      cacheService.set('key2', { data: 'test2' });
      
      cacheService.clear();
      
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.size()).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should return correct size', () => {
      expect(cacheService.size()).toBe(0);
      
      cacheService.set('key1', { data: 'test1' });
      expect(cacheService.size()).toBe(1);
      
      cacheService.set('key2', { data: 'test2' });
      expect(cacheService.size()).toBe(2);
    });

    it('should correctly check if key exists and is valid', () => {
      cacheService.set('key1', { data: 'test' });
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries in has method', (done) => {
      cacheService.set('key1', { data: 'test' }, 10); // 10ms TTL
      
      expect(cacheService.has('key1')).toBe(true);
      
      setTimeout(() => {
        expect(cacheService.has('key1')).toBe(false);
        done();
      }, 15);
    });
  });
});
