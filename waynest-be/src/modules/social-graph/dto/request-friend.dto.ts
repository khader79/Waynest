import { IsString, MinLength, MaxLength } from 'class-validator';

export class RequestFriendDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username: string;
}
