import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectProviderApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
