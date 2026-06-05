export type ImageSource =
  | 'google_places'
  | 'wikipedia'
  | 'wikimedia'
  | 'google_custom_search'
  | 'foursquare'
  | 'unsplash';

export interface PlaceImageQuery {
  name: string;
  city?: string;
  country?: string;
  type?: string;
  maxImages?: number;
  lat?: number;
  lng?: number;
}

export interface PlaceImage {
  /** Always a directly loadable URL — API key never exposed. */
  url: string;
  source: ImageSource;
  width?: number;
  height?: number;
  /** True when the image is a generic destination photo, not the specific place. */
  isGeneric: boolean;
  attribution?: string;
}

export interface ProviderStat {
  provider: ImageSource;
  durationMs: number;
  found: number;
  error?: string;
}

export interface PlaceGallery {
  placeName: string;
  topSource: ImageSource | null;
  images: PlaceImage[];
  fetchedAt: string;
  fromCache: boolean;
  stats?: ProviderStat[];
}

export interface IImageProvider {
  readonly providerName: ImageSource;
  /** Lower number = higher priority (1 is highest). */
  readonly priority: number;
  isEnabled(): boolean;
  getImages(query: PlaceImageQuery): Promise<PlaceImage[]>;
}
