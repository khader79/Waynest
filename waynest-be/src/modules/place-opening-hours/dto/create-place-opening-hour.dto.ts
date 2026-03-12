import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePlaceOpeningHourDto {
  @IsNotEmpty()
  @IsUUID()
  place: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsNotEmpty()
  @IsString()
  @Matches(TIME_FORMAT)
  openTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(TIME_FORMAT)
  closeTime: string;
}
