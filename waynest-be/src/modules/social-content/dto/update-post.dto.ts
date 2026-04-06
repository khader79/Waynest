import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SocialPostVisibility } from '../entities/social-post.entity';

const POST_IMAGE_REF = /^(\/uploads\/[^?\s]+|https?:\/\/\S+)$/i;

export class UpdatePostDto {
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
