import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsBoolean()
  skipAiReply?: boolean;
}
