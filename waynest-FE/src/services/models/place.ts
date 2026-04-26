import { Provider } from './provider';
import { CatalogCity, PlaceType } from './entities';
import type { Tag } from './tag';

// Expanding partial representation for relational entities as needed
export interface PlacePricing {
  id: string;
  // ... fields
}

export interface PlaceOpeningHour {
  id: string;
  // ... fields
}

export interface Place {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  slug: string;
  description: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
  isVerified: boolean;
  imageUrl?: string | null;
  provider?: Provider | null;
  city?: CatalogCity | null;
  tags?: Tag[];
  pricings?: PlacePricing[];
  openingHours?: PlaceOpeningHour[];
  // events?: Event[];
  // reviews?: Review[];
  // comments?: PlaceComment[];
}
