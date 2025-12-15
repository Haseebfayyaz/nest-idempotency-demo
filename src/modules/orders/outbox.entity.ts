import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('outbox')
export class Outbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_type' })
  eventType!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;
}
