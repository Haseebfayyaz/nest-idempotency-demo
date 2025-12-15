import Redis from 'ioredis';
import {
  GenericContainer,
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
  StartedTestContainer,
} from 'testcontainers';
import { DataSourceOptions } from 'typeorm';
import dataSource from '../src/typeorm.config';

let pg: StartedPostgreSqlContainer;
let redis: StartedTestContainer;

beforeAll(async () => {
  jest.setTimeout(120_000);

  pg = await new PostgreSqlContainer('postgres:15')
    .withDatabase('orders')
    .withUsername('orders')
    .withPassword('orders')
    .start();

  redis = await new GenericContainer('redis:7').withExposedPorts(6379).start();

  process.env.DB_HOST = pg.getHost();
  process.env.DB_PORT = pg.getMappedPort(5432).toString();
  process.env.DB_USER = pg.getUsername();
  process.env.DB_PASSWORD = pg.getPassword();
  process.env.DB_NAME = pg.getDatabase();
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = redis.getMappedPort(6379).toString();

  if (!dataSource.isInitialized) {
    const updatedOptions: DataSourceOptions = {
      ...(dataSource.options as DataSourceOptions),
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
    dataSource.setOptions(updatedOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
  }
});

beforeEach(async () => {
  if (dataSource.isInitialized) {
    await dataSource.query('TRUNCATE TABLE outbox;');
    await dataSource.query('TRUNCATE TABLE orders;');
  }

  const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT ?? 6379),
  });
  await redisClient.flushall();
  await redisClient.quit();
});

afterAll(async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  await pg?.stop();
  await redis?.stop();
});


