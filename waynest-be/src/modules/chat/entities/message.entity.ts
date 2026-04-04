import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageReceipt } from './message-receipt.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message extends BaseEntity {
  @ManyToOne(() => Conversation, { nullable: false })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @OneToMany(() => MessageReceipt, (receipt) => receipt.message)
  receipts: MessageReceipt[];
}
