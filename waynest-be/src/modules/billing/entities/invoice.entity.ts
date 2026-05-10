import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  @Column({ type: 'varchar', length: 255, unique: true })
  providerInvoiceId: string;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'int', default: 0 })
  amountPaidCents: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hostedInvoiceUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invoicePdfUrl?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
