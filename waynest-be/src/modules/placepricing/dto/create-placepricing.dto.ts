import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreatePlacepricingDto {
  @IsNotEmpty()
  @IsUUID()
  place: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  currencyCode: string;

  @IsOptional()
  @IsBoolean()
  perPerson?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
