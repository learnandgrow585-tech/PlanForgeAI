import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * A small cache abstraction. Uses Redis when REDIS_URL is reachable, and
 * transparently falls back to an in-process Map otherwise — so the app caches
 * (and saves AI quota) even when no Redis is running locally.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger('Cache');
  private redis: Redis | null = null;
  private redisReady = false;
  private readonly mem = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.log('No REDIS_URL — using in-memory cache.');
      return;
    }
    try {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't spam reconnects in dev
      });
      this.redis.on('error', () => {
        if (this.redisReady) this.logger.warn('Redis error — falling back to memory.');
        this.redisReady = false;
      });
      this.redis
        .connect()
        .then(() => {
          this.redisReady = true;
          this.logger.log('Connected to Redis.');
        })
        .catch(() => {
          this.logger.log('Redis unreachable — using in-memory cache.');
          this.redisReady = false;
        });
    } catch {
      this.logger.log('Redis init failed — using in-memory cache.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisReady && this.redis) {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
    } catch {
      /* fall through to memory */
    }
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.mem.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 86_400): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.redisReady && this.redis) {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      }
    } catch {
      /* fall through to memory */
    }
    this.mem.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }
}
