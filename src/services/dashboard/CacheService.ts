/**
 * Dashboard-specific caching service for performance optimization
 */
export class DashboardCacheService {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private static readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes
  private static readonly STATS_TTL = 1 * 60 * 1000; // 1 minute for stats
  private static readonly PORTFOLIO_TTL = 5 * 60 * 1000; // 5 minutes for portfolio data

  static set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  static getDashboardKey(userId: string, userRole: string): string {
    return `dashboard:${userId}:${userRole}`;
  }

  static getStatsKey(userId: string, userRole: string): string {
    return `dashboard-stats:${userId}:${userRole}`;
  }

  static getPortfolioKey(userId: string): string {
    return `agent-portfolio:${userId}`;
  }

  // Preload dashboard data in background
  static async preloadDashboardData(
    userId: string, 
    userRole: string, 
    dataLoader: () => Promise<any>
  ): Promise<void> {
    const key = this.getDashboardKey(userId, userRole);
    
    try {
      const data = await dataLoader();
      this.set(key, data, this.DEFAULT_TTL);
    } catch (error) {
      console.warn('Failed to preload dashboard data:', error);
    }
  }

  // Clear user-specific cache on logout
  static clearUserCache(userId: string): void {
    this.invalidate(userId);
  }
}