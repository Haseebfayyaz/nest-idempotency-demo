import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'closed');
    `);
    await queryRunner.query(`
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        status order_status NOT NULL,
        version integer NOT NULL DEFAULT 1,
        total_cents integer NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_orders_tenant_created_id ON orders (tenant_id, created_at DESC, id DESC);
    `);
    await queryRunner.query(`
      CREATE TABLE outbox (
        id uuid PRIMARY KEY,
        event_type text NOT NULL,
        order_id uuid NOT NULL,
        tenant_id text NOT NULL,
        payload jsonb NOT NULL,
        published_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS outbox;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_orders_tenant_created_id;');
    await queryRunner.query('DROP TABLE IF EXISTS orders;');
    await queryRunner.query('DROP TYPE IF EXISTS order_status;');
  }
}


