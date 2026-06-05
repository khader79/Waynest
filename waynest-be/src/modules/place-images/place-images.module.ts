import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// ── Providers ───────────────────────────────────────────────────────────────
import { GooglePlacesProvider } from './providers/google-places.provider';
import { WikipediaProvider } from './providers/wikipedia.provider';
import { WikimediaProvider } from './providers/wikimedia.provider';
import { GoogleCustomSearchProvider } from './providers/google-custom-search.provider';
import { FoursquareProvider } from './providers/foursquare.provider';
import { UnsplashProvider } from './providers/unsplash.provider';

// ── Services & Utils ─────────────────────────────────────────────────────────
import { PlaceImageCacheService } from './place-image-cache.service';
import { PlaceImageService, IMAGE_PROVIDERS } from './place-image.service';

// ── Controllers ──────────────────────────────────────────────────────────────
import { PlaceImagesController } from './place-images.controller';
import { PlacesImagesController } from './places-images.controller';

// ── Interface ─────────────────────────────────────────────────────────────────
import { IImageProvider } from './interfaces/image-provider.interface';

/**
 * Provider priority order (lower number = tried first):
 *   1  Google Places API    — best for real place photos, most accurate
 *   2  Wikipedia REST API   — free, reliable for landmarks & cities
 *   3  Wikimedia Commons    — free, extensive photo library
 *   4  Google Custom Search — broad web image search
 *   5  Foursquare           — good for venues/restaurants in covered areas
 *   6  Unsplash             — final fallback, generic travel aesthetic
 */
@Module({
  imports: [ConfigModule],
  controllers: [PlaceImagesController, PlacesImagesController],
  providers: [
    // ── Individual provider instances ─────────────────────────────────────
    GooglePlacesProvider,
    WikipediaProvider,
    WikimediaProvider,
    GoogleCustomSearchProvider,
    FoursquareProvider,
    UnsplashProvider,

    // ── Sorted providers array (injected by PlaceImageService) ───────────
    {
      provide: IMAGE_PROVIDERS,
      useFactory: (
        google:  GooglePlacesProvider,
        wiki:    WikipediaProvider,
        wikimed: WikimediaProvider,
        gcs:     GoogleCustomSearchProvider,
        fsq:     FoursquareProvider,
        unspl:   UnsplashProvider,
      ): IImageProvider[] =>
        [google, wiki, wikimed, gcs, fsq, unspl].sort(
          (a, b) => a.priority - b.priority,
        ),
      inject: [
        GooglePlacesProvider,
        WikipediaProvider,
        WikimediaProvider,
        GoogleCustomSearchProvider,
        FoursquareProvider,
        UnsplashProvider,
      ],
    },

    // ── Core services ─────────────────────────────────────────────────────
    PlaceImageCacheService,
    PlaceImageService,
  ],
  exports: [PlaceImageService],
})
export class PlaceImagesModule {}
