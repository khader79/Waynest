import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GlobalSearchQueryDto {
  /** Optional: empty returns all matches per type (e.g. all places when types=place). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  /** Comma-separated: users,providers,places,events */
  @IsOptional()
  @IsString()
  types?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  limit?: number;
}
