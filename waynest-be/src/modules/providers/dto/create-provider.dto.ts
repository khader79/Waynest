import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { VerificationStatusEnum } from '../entities/provider.entity';

export class CreateProviderDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Display name must be provided' })
  @IsString({ message: 'Display name must be a string' })
  @Length(3, 150, { message: 'Display name must be 3-150 characters' })
  displayName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 8000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  @Length(3, 200)
  slug?: string;

  @IsOptional()
  @IsEnum(VerificationStatusEnum)
  verificationStatus?: VerificationStatusEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  registrationNumber?: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Phone must be provided' })
  @IsString({ message: 'Phone must be a string' })
  @Length(5, 50, { message: 'Phone must be 5-50 characters' })
  phone!: string;

  @IsOptional()
  @IsString()
  @Length(5, 50)
  secondaryPhone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverPhotoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'City must be provided' })
  @IsString({ message: 'City must be a string (use city name)' })
  city!: string;
}
