import { DataSource, DataSourceOptions } from 'typeorm';
import dbConfig from './config/database.config';
import { Order } from './modules/orders/orders.entity';
import { Outbox } from './modules/orders/outbox.entity';
import { InitSchema1710000000000 } from './migrations/1710000000000-init';

// Strip Nest-specific option and provide explicit DataSourceOptions for CLI/migrations
const { autoLoadEntities, ...baseConfig } = dbConfig as DataSourceOptions & {
  autoLoadEntities?: boolean;
};

const options: DataSourceOptions = {
  ...baseConfig,
  entities: [Order, Outbox],
  migrations: [InitSchema1710000000000],
};

export default new DataSource(options);
