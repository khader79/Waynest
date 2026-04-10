import { BaseEntity } from 'src/common/entities/base.entity';
import { Place } from 'src/modules/place/entities/place.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

export enum PlaceVerificationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('place_verification_requests')
export class PlaceVerificationRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  placeId: string;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'placeId' })
  place: Place;

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser?: User;

  @Column({
    type: 'varchar',
    length: 16,
    default: PlaceVerificationRequestStatus.PENDING,
  })
  status: PlaceVerificationRequestStatus;
}
