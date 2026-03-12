import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from 'src/modules/place/entities/place.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ImageFetcherService {
  private readonly apiKey = process.env.GOOGLE_PLACES_KEY;

  constructor(
    @InjectRepository(Place)
    private placeRepo: Repository<Place>,
  ) {}

  async ensureImage(place: Place): Promise<string | null> {
    if (place.imageUrl) return place.imageUrl;

    try {
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(place.name + ' Bethlehem')}&inputtype=textquery&fields=place_id&key=${this.apiKey}`,
      );
      const searchData = await searchRes.json();
      const placeId = searchData.candidates?.[0]?.place_id;
      if (!placeId) return null;

      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${this.apiKey}`,
      );
      const detailData = await detailRes.json();
      const photoRef = detailData.result?.photos?.[0]?.photo_reference;
      if (!photoRef) return null;

      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${this.apiKey}`;
      await this.placeRepo.update(place.id, { imageUrl });
      console.log(`[image] saved: ${place.name}`);
      return imageUrl;
    } catch (err) {
      console.error(`[image] failed: ${place.name}`, err);
      return null;
    }
  }
}
