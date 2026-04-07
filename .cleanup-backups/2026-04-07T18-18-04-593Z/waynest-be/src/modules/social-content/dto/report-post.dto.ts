import { IsString, MinLength } from 'class-validator';

export class ReportPostDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
