import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class ShareTripDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class PublicTripResponse {
  id!: string;
  shareSlug!: string;
  isPublic!: boolean;
  title!: string | null;
  description!: string | null;
  cityId!: string;
  cityName!: string | null;
  days!: number;
  budget!: number;
  persons!: number;
  generatedPlan!: {
    days: Array<{
      day: number;
      morning: { placeId?: string; name: string; type?: string; duration: string; estimatedCost: number; openTime?: string; closeTime?: string };
      afternoon: { placeId?: string; name: string; type?: string; duration: string; estimatedCost: number; openTime?: string; closeTime?: string } | null;
      evening: { placeId?: string; name: string; type?: string; duration: string; estimatedCost: number; openTime?: string; closeTime?: string } | null;
      totalDayCost: number;
    }>;
    totalEstimatedCost: number;
    tips: string[];
  };
  viewCount!: number;
  createdAt!: Date;
}
