import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailVerificationDto } from './create-email-verification.dto';

export class UpdateEmailVerificationDto extends PartialType(
  CreateEmailVerificationDto,
) {}
