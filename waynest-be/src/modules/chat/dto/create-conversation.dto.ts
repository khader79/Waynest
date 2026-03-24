import { IsArray, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @IsString()
  @MinLength(1)
  firstMessage: string;
}
