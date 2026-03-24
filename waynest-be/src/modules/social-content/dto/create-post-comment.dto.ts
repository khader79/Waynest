import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePostCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

