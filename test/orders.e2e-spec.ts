import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/common/filters/http-exception.filter';
import { CorrelationInterceptor } from '../src/common/interceptors/correlation.interceptor';
import { PulsarPublisher } from '../src/events/pulsar.publisher';
import { Order, OrderStatus } from '../src/modules/orders/orders.entity';
import { Outbox } from '../src/modules/orders/outbox.entity';

describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let outboxRepo: Repository<Outbox>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PulsarPublisher)
      .useValue({ publish: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpErrorFilter());
    app.useGlobalInterceptors(new CorrelationInterceptor());
    await app.init();

    dataSource = app.get(DataSource);
    outboxRepo = dataSource.getRepository(Outbox);
  });

  afterAll(async () => {
    await app?.close();
  });

  const tenantHeader = { 'x-tenant-id': 'tenant-a' };

  const createDraft = (key: string, body: unknown = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(tenantHeader)
      .set('Idempotency-Key', key)
      .send(body);

  const confirm = (id: string, version: number, totalCents = 1234) =>
    request(app.getHttpServer())
      .patch(`/api/v1/orders/${id}/confirm`)
      .set(tenantHeader)
      .set('If-Match', `"${version}"`)
      .send({ totalCents });

  it('replays same response for identical idempotency key + body', async () => {
    const first = await createDraft('idem-1').expect(200);
    const second = await createDraft('idem-1').expect(200);

    expect(second.body.id).toEqual(first.body.id);
    expect(second.body.status).toEqual(OrderStatus.DRAFT);
  });

  it('returns 409 when idempotency key is reused with a different body', async () => {
    await createDraft('idem-2', { foo: 'bar' }).expect(200);
    const res = await createDraft('idem-2', { foo: 'baz' }).expect(409);

    expect(res.body.error.code).toBe('ConflictException');
  });

  it('confirms with optimistic locking and rejects stale version', async () => {
    const draft = await createDraft('idem-3').expect(200);
    const confirmRes = await confirm(draft.body.id, 1, 5555).expect(200);

    expect(confirmRes.body.status).toBe(OrderStatus.CONFIRMED);
    expect(confirmRes.body.version).toBe(2);
    expect(confirmRes.body.totalCents).toBe(5555);

    await confirm(draft.body.id, 1).expect(409);
  });

  it('closes an order and writes an outbox row in one transaction', async () => {
    const draft = await createDraft('idem-4').expect(200);
    await confirm(draft.body.id, 1, 5000).expect(200);

    const closeRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${draft.body.id}/close`)
      .set(tenantHeader)
      .expect(200);

    expect(closeRes.body.status).toBe(OrderStatus.CLOSED);
    expect(closeRes.body.version).toBe(3);

    const outboxRows = await outboxRepo.find({ where: { orderId: draft.body.id } });
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0].eventType).toBe('orders.closed');
  });

  it('lists orders with stable keyset pagination', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await createDraft(`idem-list-${i}`).expect(200);
      ids.push(res.body.id);
    }

    const page1 = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(tenantHeader)
      .query({ limit: 10 })
      .expect(200);

    expect(page1.body.items).toHaveLength(10);
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(tenantHeader)
      .query({ cursor: page1.body.nextCursor, limit: 10 })
      .expect(200);

    expect(page2.body.items).toHaveLength(5);
    const returnedIds = [...page1.body.items, ...page2.body.items].map(
      (o: Order) => o.id,
    );
    const uniqueCount = new Set(returnedIds).size;
    expect(uniqueCount).toBe(15);
  });
});


