import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { SocialPostVisibility } from '../entities/social-post.entity';

/** Uploaded media: relative path (preferred) or absolute upload URL from any origin. */
const POST_IMAGE_REF = /^(\/uploads\/[^?\s]+|https?:\/\/\S+)$/i;

export class CreatePostDto {
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @IsOptional()
  @IsUUID()
  tripPlanId?: string;

  /** Waynest place — takes priority over free-text location when set */
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @IsOptional()
  @IsUUID()
  placeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(SocialPostVisibility)
  visibility?: SocialPostVisibility;

  @IsOptional()
  @IsArray()
  @Matches(POST_IMAGE_REF, {
    each: true,
    message: 'each imageUrls entry must be /uploads/... or a valid http(s) URL',
  })
  imageUrls?: string[];
}
