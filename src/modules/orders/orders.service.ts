import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './orders.entity';
import { Outbox } from './outbox.entity';
import { randomUUID, createHash } from 'crypto';
import Redis from 'ioredis';
import { PulsarPublisher } from '../../events/pulsar.publisher';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';

type RedisSettings = { host: string; port: number; ttlSeconds: number };

@Injectable()
export class OrdersService {
  private readonly redis: Redis;
  private readonly redisTtlSeconds: number;

  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly publisher: PulsarPublisher,
  ) {
    const redisCfg: RedisSettings = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      ttlSeconds: Number(process.env.REDIS_TTL_SECONDS ?? 3600),
    };
    this.redis = new Redis({
      host: redisCfg.host,
      port: redisCfg.port,
    });
    this.redisTtlSeconds = redisCfg.ttlSeconds;
  }

  async createDraft(
    tenantId: string,
    idempotencyKey: string,
    body: unknown = {},
  ) {
    const redisKey = `idemp:${tenantId}:${idempotencyKey}`;
    const cached = await this.redis.get(redisKey);
    const bodyHash = this.hashBody(body);

    if (cached) {
      const parsed = JSON.parse(cached) as {
        bodyHash: string;
        response: Order;
      };
      if (parsed.bodyHash !== bodyHash) {
        throw new ConflictException('Idempotency key already used');
      }
      return parsed.response;
    }

    const order = this.repo.create({
      id: randomUUID(),
      tenantId,
      status: OrderStatus.DRAFT,
      version: 1,
    });

    await this.repo.save(order);
    await this.redis.set(
      redisKey,
      JSON.stringify({ bodyHash, response: order }),
      'EX',
      this.redisTtlSeconds,
    );
    await this.publisher.publish('orders.created', tenantId, order);

    return order;
  }

  async confirm(
    id: string,
    tenantId: string,
    version: number,
    dto: ConfirmOrderDto,
  ) {
    if (!Number.isInteger(version) || version < 1) {
      throw new ConflictException('Version required');
    }
    const order = await this.repo.findOneBy({ id, tenantId });
    if (!order) throw new NotFoundException();
    if (order.status !== OrderStatus.DRAFT) {
      throw new ConflictException('Only draft orders can be confirmed');
    }
    if (order.version !== version)
      throw new ConflictException('Version mismatch');

    order.status = OrderStatus.CONFIRMED;
    order.totalCents = dto.totalCents;
    order.version++;

    await this.repo.save(order);
    await this.publisher.publish('orders.confirmed', tenantId, order);

    return order;
  }

  async close(id: string, tenantId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOneBy(Order, { id, tenantId });
      if (!order) throw new NotFoundException();
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException('Order must be confirmed before close');
      }

      order.status = OrderStatus.CLOSED;
      order.version++;
      await manager.save(order);

      await manager.insert(Outbox, {
        id: randomUUID(),
        eventType: 'orders.closed',
        orderId: order.id,
        tenantId,
        payload: {
          orderId: order.id,
          tenantId,
          totalCents: order.totalCents as number,
          closedAt: new Date().toISOString(),
        },
      });

      await this.publisher.publish('orders.closed', tenantId, order);
      return order;
    });
  }

  async list(tenantId: string, dto: ListOrdersDto) {
    const take = Math.min(dto.limit ?? 20, 100);

    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .limit(take + 1);

    if (dto.cursor) {
      const cursor = this.decodeCursor(dto.cursor);
      qb.andWhere('(o.created_at, o.id) < (:createdAt, :id)', cursor);
    }

    const rows = await qb.getMany();
    const hasNext = rows.length > take;
    const items = hasNext ? rows.slice(0, take) : rows;

    const nextCursor = hasNext
      ? Buffer.from(
          `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1].id}`,
        ).toString('base64')
      : null;

    return { items, nextCursor };
  }

  private hashBody(body: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(body ?? {}))
      .digest('hex');
  }

  private decodeCursor(cursor: string) {
    try {
      const [createdAt, id] = Buffer.from(cursor, 'base64')
        .toString('utf8')
        .split('|');
      if (!createdAt || !id) throw new Error('Invalid cursor');
      return { createdAt, id };
    } catch {
      throw new ConflictException('Invalid cursor');
    }
  }
}
