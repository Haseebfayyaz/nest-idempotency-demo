import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'orders',
  password: process.env.DB_PASSWORD ?? 'orders',
  database: process.env.DB_NAME ?? 'orders_db',
  autoLoadEntities: true,
  synchronize: false,
};

export default config;
