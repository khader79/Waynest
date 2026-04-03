import { IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SocialPostVisibility } from '../entities/social-post.entity';

const HTTP_S_URL = /^https?:\/\/\S+$/i;

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
  @Matches(HTTP_S_URL, { each: true, message: 'each imageUrls entry must be a valid http(s) URL' })
  imageUrls?: string[];
}
