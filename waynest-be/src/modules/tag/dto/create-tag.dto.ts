import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateTagDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  name: string;
}
