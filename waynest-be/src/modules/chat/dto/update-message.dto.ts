import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  emoji?: string;
}
