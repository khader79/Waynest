import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('email_verification_tokens')
export class EmailVerificationToken extends BaseEntity {
  @Column({ type: 'varchar', unique: true, nullable: true })
  token: string | null;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
