import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivateInviteDto {
  @ApiProperty({ description: 'Invite token to activate' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint to associate with this invite',
  })
  @IsOptional()
  @IsString()
  fingerprint?: string;
}
