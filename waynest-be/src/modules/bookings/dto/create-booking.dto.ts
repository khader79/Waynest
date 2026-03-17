import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  placeId: string;

  @IsDateString()
  bookingDate: string;

  @IsInt()
  @Min(1)
  @Max(50)
  persons: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
