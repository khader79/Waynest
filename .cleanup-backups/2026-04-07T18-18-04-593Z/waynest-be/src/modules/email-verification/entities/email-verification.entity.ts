import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('email_verification_tokens')
export class EmailVerificationToken extends BaseEntity {
  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  token: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
