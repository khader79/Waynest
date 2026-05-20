import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class NotificationChannelsDto {
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  channels?: NotificationChannelsDto;

  @IsOptional()
  @IsObject()
  typePreferences?: Record<string, unknown>;
}
