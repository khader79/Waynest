import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsPhoneNumber,
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

  @IsNotEmpty()
  @IsString()
  @Length(3, 200)
  slug: string;

  @IsEnum(ProviderTypeEnum)
  providerType: ProviderTypeEnum;

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
  city: string;
}
