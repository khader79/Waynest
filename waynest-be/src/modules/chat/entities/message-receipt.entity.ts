import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Message } from './message.entity';

@Entity('message_receipts')
@Index(['messageId', 'userId'], { unique: true })
export class MessageReceipt extends BaseEntity {
  @ManyToOne(() => Message, (message) => message.receipts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;
}
