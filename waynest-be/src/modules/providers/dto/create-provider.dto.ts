import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import {
  ProviderTypeEnum,
  VerificationStatusEnum,
} from '../entities/provider.entity';

export class CreateProviderDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 150)
  displayName: string;

  @IsOptional()
  @IsString()
  @Length(3, 200)
  slug?: string;

  @IsNotEmpty()
  @IsEnum(ProviderTypeEnum)
  providerType: ProviderTypeEnum;

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

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  phone: string;

  @IsOptional()
  @IsString()
  @Length(5, 50)
  secondaryPhone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsNotEmpty()
  @IsString()
  city: string;
}
