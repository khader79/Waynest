import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SocialPostVisibility } from '../entities/social-post.entity';

export class CreatePostDto {
  @IsUUID()
  tripPlanId: string;

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
}

