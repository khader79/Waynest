import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsPhoneNumber,
  IsISO31661Alpha2,
  IsNumber,
  Min,
  Max,
  Length,
  IsDecimal,
} from 'class-validator';
import { ProviderTypeEnum } from '../entities/provider.entity';

export class CreateProviderDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 150)
  displayName: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 180)
  slug: string;

  @IsOptional()
  @IsString()
  @Length(3, 200)
  legalName?: string;

  @IsEnum(ProviderTypeEnum)
  providerType: ProviderTypeEnum;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsPhoneNumber()
  secondaryPhone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsISO31661Alpha2()
  @IsNotEmpty()
  countryCode: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  city: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priceLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
