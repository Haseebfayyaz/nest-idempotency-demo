import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
}

@Entity('orders')
@Index(['tenantId', 'createdAt', 'id'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status!: OrderStatus;

  @Column({ default: 1 })
  version!: number;

  @Column({ name: 'total_cents', type: 'integer', nullable: true })
  totalCents!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
