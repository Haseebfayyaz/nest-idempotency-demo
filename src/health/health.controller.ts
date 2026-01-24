import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';

@Controller('/health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
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
      await this.redis.ping();
      redisUp = true;
    } catch {
      // Redis is down
    }

    return {
      status: dbUp && redisUp ? 'ready' : 'not_ready',
      checks: {
        database: dbUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
    };
  }
}
