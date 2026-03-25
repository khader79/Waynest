import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
