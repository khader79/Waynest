import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export type ShareVisibility = 'PUBLIC' | 'FRIENDS';

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

  @IsIn(['PUBLIC', 'FRIENDS'])
  @IsOptional()
  shareVisibility?: ShareVisibility;
}

export class PublicTripResponse {
  id!: string;
  shareSlug!: string;
  shareUrl!: string | null;
  isPublic!: boolean;
  shareVisibility!: ShareVisibility;
  ownerUserId!: string | null;
  isOwner!: boolean;
  canManageShare!: boolean;
  canSaveToMyPlans!: boolean;
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
      morning: {
        placeId?: string;
        name: string;
        type?: string;
        duration: string;
        estimatedCost: number;
        openTime?: string;
        closeTime?: string;
      };
      afternoon: {
        placeId?: string;
        name: string;
        type?: string;
        duration: string;
        estimatedCost: number;
        openTime?: string;
        closeTime?: string;
      } | null;
      evening: {
        placeId?: string;
        name: string;
        type?: string;
        duration: string;
        estimatedCost: number;
        openTime?: string;
        closeTime?: string;
      } | null;
      totalDayCost: number;
    }>;
    totalEstimatedCost: number;
    tips: string[];
  };
  viewCount!: number;
  createdAt!: Date;
}
