import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlaceImageService } from './place-image.service';

/**
 * Universal place image endpoint.
 * GET /places/images?name=xxx&city=xxx&type=xxx&lat=xx&lng=xx&maxImages=5
 *
 * Returns:
 *  { place, images, provider, count, fromCache }
 */
@Controller('places')
export class PlacesImagesController {
  constructor(private readonly imageService: PlaceImageService) {}

  @Get('images')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getPlaceImages(
    @Query('name')      name: string,
    @Query('city')      city?: string,
    @Query('country')   country?: string,
    @Query('type')      type?: string,
    @Query('lat')       latStr?: string,
    @Query('lng')       lngStr?: string,
    @Query('maxImages') maxImagesStr?: string,
  ) {
    if (!name?.trim()) {
      throw new BadRequestException('name query parameter is required');
    }

    const maxImages = Math.min(Math.max(Number(maxImagesStr) || 5, 1), 10);
    const lat = latStr != null ? Number(latStr) : undefined;
    const lng = lngStr != null ? Number(lngStr) : undefined;

    const gallery = await this.imageService.getGallery({
      name: name.trim(),
      city: city?.trim(),
      country: country?.trim(),
      type: type?.trim(),
      maxImages,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    });

    return {
      place:     gallery.placeName,
      images:    gallery.images.map(img => img.url),
      provider:  gallery.topSource,
      count:     gallery.images.length,
      fromCache: gallery.fromCache,
    };
  }
}
