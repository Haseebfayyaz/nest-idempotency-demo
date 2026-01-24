import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './modules/orders/orders.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './common/redis/redis.module';
import dbConfig from './config/database.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    TypeOrmModule.forRoot(dbConfig),
    RedisModule,
    OrdersModule,
    HealthModule,
  ],
})
export class AppModule {}
