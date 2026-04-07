import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * URL shape is validated in {@link StoriesService} so we never rely on `@IsUrl()`
 * (its default error text confuses devs when the running build is stale).
 */
export class CreateStoryDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
