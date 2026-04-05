import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('conversations')
@Index(['updatedAt'])
export class Conversation extends BaseEntity {
  @Column({ type: 'varchar', nullable: true, length: 200 })
  title: string | null;

  @Column({ name: 'is_group', type: 'boolean', default: false })
  isGroup: boolean;
}
