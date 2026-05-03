import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('calendar_entries')
@Index('idx_calendar_entries_user_date', ['userId', 'calendarDate'])
@Index('uq_calendar_entries_user_place_date', ['userId', 'placeId', 'calendarDate'], { unique: true })
export class CalendarEntry extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'place_id', type: 'uuid', nullable: true })
  placeId: string | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Place, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'place_id' })
  place: Place | null;

  @Column({ name: 'calendar_date', type: 'date' })
  calendarDate: string;

  @Column({ name: 'start_time', type: 'varchar', length: 8, nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'varchar', length: 8, nullable: true })
  endTime: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 32, default: 'manual' })
  sourceType: string;

  @Column({ name: 'source_label', type: 'varchar', length: 200, nullable: true })
  sourceLabel: string | null;

  @Column({
    name: 'shared_with_user_ids',
    type: 'uuid',
    array: true,
    default: () => "'{}'",
  })
  sharedWithUserIds: string[];
}
