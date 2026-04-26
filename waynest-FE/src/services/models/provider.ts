import { User } from './user';
import { CatalogCity } from './entities';

export enum VerificationStatusEnum {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export interface Provider {
  id: string;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  description?: string | null;
  categories?: string[] | null;
  ownerUserId?: string | null;
  owner?: User | null;
  slug: string;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  verificationStatus: VerificationStatusEnum;
  isActive: boolean;
  phone: string;
  secondaryPhone?: string | null;
  website?: string | null;
  coverPhotoUrl?: string | null;
  logoUrl?: string | null;
  city?: CatalogCity | null;
  // memberships?: ProviderMembership[];
  // places?: Place[];
}
