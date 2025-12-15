import { Controller, Get } from '@nestjs/common';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Controller('/health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  async readiness() {
    const dbUp = this.dataSource.isInitialized;
    let redisUp = false;

    try {
      await new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
      }).ping();
      redisUp = true;
    } catch {}

    return {
      status: dbUp && redisUp ? 'ready' : 'not_ready',
      checks: {
        database: dbUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
    };
  }
}
