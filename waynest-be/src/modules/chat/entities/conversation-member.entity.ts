import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Conversation } from './conversation.entity';

export type ConversationMemberRole = 'MEMBER' | 'ADMIN';

@Entity('conversation_members')
@Index(['conversationId', 'userId'], { unique: true })
@Index(['userId'])
export class ConversationMember extends BaseEntity {
  @ManyToOne(() => Conversation, { nullable: false })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'conversation_role',
    type: 'varchar',
    length: 16,
    default: 'MEMBER',
  })
  conversationRole: ConversationMemberRole;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @Column({ name: 'pinned_at', type: 'timestamptz', nullable: true })
  pinnedAt: Date | null;

  @Column({ name: 'muted_at', type: 'timestamptz', nullable: true })
  mutedAt: Date | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
