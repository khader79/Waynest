import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDeviceDto {
  @ApiProperty({ description: 'Device fingerprint to allow' })
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}
