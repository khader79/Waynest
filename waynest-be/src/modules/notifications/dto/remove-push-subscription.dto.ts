import { IsString, MinLength } from 'class-validator';

export class RemovePushSubscriptionDto {
  @IsString()
  @MinLength(1)
  endpoint!: string;
}
