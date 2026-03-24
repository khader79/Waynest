import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_members')
@Index(['conversationId', 'userId'], { unique: true })
export class ConversationMember extends BaseEntity {
  @ManyToOne(() => Conversation, { nullable: false })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id', type: 'varchar' })
  conversationId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt: Date | null;
}
