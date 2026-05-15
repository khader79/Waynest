import { IsBoolean, IsOptional } from 'class-validator';

export class OpenAiConversationDto {
  @IsOptional()
  @IsBoolean()
  skipWelcome?: boolean;
}
