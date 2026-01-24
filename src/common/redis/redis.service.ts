import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly ttlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds =
      this.configService.get<number>('redis.ttlSeconds') ?? 3600;
  }

  onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    const ttl = ttlSeconds ?? this.ttlSeconds;
    return this.client.set(key, value, 'EX', ttl);
  }

  async del(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.exists(key);
  }

  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.ping();
  }

  getClient(): Redis | null {
    return this.client;
  }
}
