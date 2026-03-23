import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  Max,
  Min,
} from 'class-validator';
import { ReviewStatus } from '../entities/review.entity';

export class CreateReviewDto {
  @IsOptional()
  @IsUUID()
  place?: string;

  @IsOptional()
  @IsUUID()
  event?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(ReviewStatus)
  @ValidateIf((dto: CreateReviewDto) => dto.status !== undefined)
  status?: ReviewStatus;
}
