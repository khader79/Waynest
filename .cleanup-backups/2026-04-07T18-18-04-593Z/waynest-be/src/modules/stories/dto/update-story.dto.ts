import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
