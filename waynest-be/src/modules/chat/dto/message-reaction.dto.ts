import { IsString, MinLength } from 'class-validator';

export class MessageReactionDto {
  @IsString()
  @MinLength(1)
  emoji: string;
}
