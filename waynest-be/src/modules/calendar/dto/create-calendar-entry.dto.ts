import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCalendarEntryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  placeName?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsIn(['manual', 'place', 'event'])
  sourceType?: 'manual' | 'place' | 'event';

  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sharedWithUserIds?: string[];
}
