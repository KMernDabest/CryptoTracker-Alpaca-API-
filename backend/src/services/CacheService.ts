import Redis from 'ioredis';
import { MarketData } from './MarketDataService';

export class CacheService {
  private redis?: Redis;
  private isConnected: boolean = false;
  private memoryCache: Map<string, any> = new Map();

  constructor() {
    // Initialize Redis if available, otherwise use memory cache
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async connect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.ping();
        this.isConnected = true;
        console.log('Connected to Redis cache');
      } catch (error) {
        console.warn('Failed to connect to Redis, using memory cache:', error);
        this.redis = undefined;
      }
    } else {
      console.log('Using memory cache (Redis not configured)');
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
    this.memoryCache.clear();
  }

  async setMarketData(symbol: string, data: MarketData): Promise<void> {
    const key = `market:${symbol}`;
    const value = JSON.stringify(data);
    
    if (this.redis && this.isConnected) {
      await this.redis.setex(key, 60, value); // Cache for 1 minute
    } else {
      this.memoryCache.set(key, { value, expiry: Date.now() + 60000 });
    }
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    const key = `market:${symbol}`;
    
    if (this.redis && this.isConnected) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Convert timestamp string back to Date object
        if (parsed.timestamp) {
          parsed.timestamp = new Date(parsed.timestamp);
        }
        return parsed;
      }
      return null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        const parsed = JSON.parse(cached.value);
        // Convert timestamp string back to Date object
        if (parsed.timestamp) {
          parsed.timestamp = new Date(parsed.timestamp);
        }
        return parsed;
      }
      if (cached) {
        this.memoryCache.delete(key); // Remove expired entry
      }
      return null;
    }
  }

  async setCandlestickData(symbol: string, timeframe: string, data: any): Promise<void> {
    const key = `candles:${symbol}:${timeframe}`;
    const value = JSON.stringify(data);
    
    if (this.redis && this.isConnected) {
      await this.redis.setex(key, 300, value); // Cache for 5 minutes
    } else {
      this.memoryCache.set(key, { value, expiry: Date.now() + 300000 });
    }
  }

  async getCandlestickData(symbol: string, timeframe: string): Promise<any | null> {
    const key = `candles:${symbol}:${timeframe}`;
    
    if (this.redis && this.isConnected) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return JSON.parse(cached.value);
      }
      if (cached) {
        this.memoryCache.delete(key);
      }
      return null;
    }
  }

  async setUserSession(userId: string, sessionData: any): Promise<void> {
    const key = `session:${userId}`;
    const value = JSON.stringify(sessionData);
    
    if (this.redis && this.isConnected) {
      await this.redis.setex(key, 3600, value); // Cache for 1 hour
    } else {
      this.memoryCache.set(key, { value, expiry: Date.now() + 3600000 });
    }
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = `session:${userId}`;
    
    if (this.redis && this.isConnected) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return JSON.parse(cached.value);
      }
      if (cached) {
        this.memoryCache.delete(key);
      }
      return null;
    }
  }

  async deleteUserSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    
    if (this.redis && this.isConnected) {
      await this.redis.del(key);
    } else {
      this.memoryCache.delete(key);
    }
  }

  async setPortfolioCache(userId: string, portfolioData: any): Promise<void> {
    const key = `portfolio:${userId}`;
    const value = JSON.stringify(portfolioData);
    
    if (this.redis && this.isConnected) {
      await this.redis.setex(key, 300, value); // Cache for 5 minutes
    } else {
      this.memoryCache.set(key, { value, expiry: Date.now() + 300000 });
    }
  }

  async getPortfolioCache(userId: string): Promise<any | null> {
    const key = `portfolio:${userId}`;
    
    if (this.redis && this.isConnected) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return JSON.parse(cached.value);
      }
      if (cached) {
        this.memoryCache.delete(key);
      }
      return null;
    }
  }

  async invalidatePortfolioCache(userId: string): Promise<void> {
    const key = `portfolio:${userId}`;
    
    if (this.redis && this.isConnected) {
      await this.redis.del(key);
    } else {
      this.memoryCache.delete(key);
    }
  }

  // Generic cache methods
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (this.redis && this.isConnected) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      this.memoryCache.set(key, { 
        value: serialized, 
        expiry: Date.now() + (ttlSeconds * 1000) 
      });
    }
  }

  async get(key: string): Promise<any | null> {
    if (this.redis && this.isConnected) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return JSON.parse(cached.value);
      }
      if (cached) {
        this.memoryCache.delete(key);
      }
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.del(key);
    } else {
      this.memoryCache.delete(key);
    }
  }

  // Clean up expired memory cache entries periodically
  startMemoryCacheCleanup(): void {
    if (!this.redis) {
      setInterval(() => {
        const now = Date.now();
        for (const [key, cached] of this.memoryCache.entries()) {
          if (cached.expiry <= now) {
            this.memoryCache.delete(key);
          }
        }
      }, 60000); // Clean up every minute
    }
  }
}