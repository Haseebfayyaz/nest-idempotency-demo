import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './orders.entity';
import { Outbox } from './outbox.entity';
import { TenantGuard } from '../../tenant/tenant.guard';
import { PulsarPublisher } from '../../events/pulsar.publisher';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Outbox])],
  controllers: [OrdersController],
  providers: [OrdersService, TenantGuard, PulsarPublisher],
})
export class OrdersModule {}


