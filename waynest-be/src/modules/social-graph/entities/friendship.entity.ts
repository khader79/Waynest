import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Entity('friendships')
@Unique(['userLowId', 'userHighId'])
@Index(['userLowId', 'userHighId', 'status'])
@Index(['userLowId', 'status'])
@Index(['userHighId', 'status'])
export class Friendship extends BaseEntity {
  /** Lexicographically smaller user id (stable pair key). */
  @Column({ name: 'user_low_id', type: 'uuid' })
  userLowId: string;

  /** Lexicographically greater user id. */
  @Column({ name: 'user_high_id', type: 'uuid' })
  userHighId: string;

  /** User who sent the current request. */
  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;
}
