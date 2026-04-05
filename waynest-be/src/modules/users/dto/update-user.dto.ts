import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, Matches } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @Matches(/^(\/uploads\/[^?\s]+|https?:\/\/\S+)$/i, {
    message: 'avatarUrl must be /uploads/... or a valid http(s) URL',
  })
  avatarUrl?: string;
}
