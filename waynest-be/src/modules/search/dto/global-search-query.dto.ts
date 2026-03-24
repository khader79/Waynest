import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class GlobalSearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q: string;

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
