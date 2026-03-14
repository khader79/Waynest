import { Module } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from './entities/email-verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailVerificationToken])],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
