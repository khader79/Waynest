import { IsOptional, IsString, MinLength } from 'class-validator';

export class AiReplyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  userMessage?: string;
}
