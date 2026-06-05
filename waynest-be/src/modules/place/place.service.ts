import { Injectable, NotFoundException } from '@nestjs/common';
import { isUuid } from 'src/common/utils/id.util';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { In, Repository } from 'typeorm';
import { Provider } from '../providers/entities/provider.entity';
import { City } from '../cities/entities/city.entity';
import { Tag } from '../tag/entities/tag.entity';
import {
  applyDescendingCursor,
  decodeCursor,
  encodeCursor,
} from 'src/common/utils/cursor-pagination';
import { HotPathCache } from 'src/common/utils/hot-path-cache';
import { ImageFetcherService } from '../../trip-planner/image-fetcher.service';
import { PlaceImageService } from '../place-images/place-image.service';

type PlaceListRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: Place['type'];
  latitude: string | number;
  longitude: string | number;
  ratingAverage: string | number;
  ratingCount: string | number;
  isActive: boolean;
  isVerified: boolean;
  imageUrl: string | null;
  createdAt: Date | string;
  cityId: string;
  providerId: string | null;
};

type PlaceListRawRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: Place['type'];
  latitude: string | number;
  longitude: string | number;
  ratingAverage: string | number;
  ratingCount: string | number;
  isActive: boolean;
  isVerified: boolean;
  imageUrl: string | null;
  createdAt: Date | string;
  cityId: string;
  providerId: string | null;
};

@Injectable()
export class PlaceService {
  private readonly readCache = new HotPathCache(600);

  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    private readonly imageFetcher: ImageFetcherService,
    private readonly placeImageService: PlaceImageService,
  ) {}

  private cacheTtlMs(name: string, fallback: number): number {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private listCacheTtlMs() {
    return this.cacheTtlMs('PLACE_LIST_CACHE_MS', 12_000);
  }

  private nearestCacheTtlMs() {
    return this.cacheTtlMs('PLACE_NEAREST_CACHE_MS', 8_000);
  }

  private detailCacheTtlMs() {
    return this.cacheTtlMs('PLACE_DETAIL_CACHE_MS', 10_000);
  }

  private normalizeQueryPart(value?: string) {
    return value?.trim().toLowerCase() ?? '';
  }

  private clearReadCache() {
    this.readCache.clear();
  }

  private async ensurePlaceImage<
    T extends {
      id: string;
      name: string;
      imageUrl?: string | null;
      city?: { name?: string | null } | null;
    },
  >(place: T): Promise<T> {
    const resolved = await this.imageFetcher.ensureImage({
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl ?? undefined,
      city: place.city ? { name: place.city.name ?? undefined } : undefined,
    });
    if (resolved) {
      place.imageUrl = resolved;
    }
    return place;
  }

  private async ensurePlaceImages<
    T extends {
      id: string;
      name: string;
      imageUrl?: string | null;
      city?: { name?: string | null } | null;
    },
  >(places: T[]): Promise<T[]> {
    await Promise.all(places.map((place) => this.ensurePlaceImage(place)));
    return places;
  }

  private getCityRepo() {
    return this.placeRepo.manager.getRepository(City);
  }

  private getProviderRepo() {
    return this.placeRepo.manager.getRepository(Provider);
  }

  private getTagRepo() {
    return this.placeRepo.manager.getRepository(Tag);
  }

  private async resolveCityIds(country?: string, city?: string) {
    if (!country && !city) {
      return null;
    }

    const cityRepo = this.getCityRepo();
    const qb = cityRepo
      .createQueryBuilder('city')
      .leftJoin('city.country', 'country')
      .select('city.id', 'id');

    if (country?.trim()) {
      qb.andWhere('country.name ILIKE :country', {
        country: `%${country.trim()}%`,
      });
    }

    if (city?.trim()) {
      qb.andWhere('city.name ILIKE :city', { city: `%${city.trim()}%` });
    }

    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  private async loadPlaceTags(placeIds: string[]) {
    if (placeIds.length === 0) {
      return new Map<string, Tag[]>();
    }

    const rows = await this.placeRepo
      .createQueryBuilder('place')
      .leftJoin('place.tags', 'tag')
      .select('place.id', 'placeId')
      .addSelect('tag.id', 'id')
      .addSelect('tag.name', 'name')
      .where('place.id IN (:...placeIds)', { placeIds })
      .orderBy('place.id', 'ASC')
      .addOrderBy('tag.name', 'ASC')
      .getRawMany<{
        placeId: string;
        id: string | null;
        name: string | null;
      }>();

    const tagsByPlaceId = new Map<string, Tag[]>();
    for (const row of rows as Array<{
      placeId: string;
      id: string | null;
      name: string | null;
    }>) {
      if (!row.id || !row.name) {
        continue;
      }

      const list = tagsByPlaceId.get(row.placeId) ?? [];
      list.push({ id: row.id, name: row.name } as Tag);
      tagsByPlaceId.set(row.placeId, list);
    }

    return tagsByPlaceId;
  }

  private async loadPlacesRelations(rows: PlaceListRow[]) {
    if (rows.length === 0) {
      return [];
    }

    const cityIds = [...new Set(rows.map((row) => row.cityId).filter(Boolean))];
    const providerIds = [
      ...new Set(rows.map((row) => row.providerId).filter(Boolean)),
    ] as string[];
    const placeIds = rows.map((row) => row.id);

    const [cities, providers, tagsByPlaceId] = await Promise.all([
      cityIds.length > 0
        ? this.getCityRepo().find({
            where: { id: In(cityIds) },
            relations: ['country'],
          })
        : Promise.resolve([]),
      providerIds.length > 0
        ? this.getProviderRepo().find({
            where: { id: In(providerIds) },
            select: ['id', 'displayName', 'slug', 'logoUrl'],
          })
        : Promise.resolve([]),
      this.loadPlaceTags(placeIds),
    ]);

    const cityById = new Map(cities.map((city) => [city.id, city]));
    const providerById = new Map(
      providers.map((provider) => [provider.id, provider]),
    );

    return rows.map((row) => {
      const city = cityById.get(row.cityId) ?? null;
      const provider = row.providerId
        ? (providerById.get(row.providerId) ?? null)
        : null;

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        type: row.type,
        latitude: row.latitude,
        longitude: row.longitude,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
        isActive: row.isActive,
        isVerified: row.isVerified,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt,
        city,
        provider,
        tags: tagsByPlaceId.get(row.id) ?? [],
      };
    });
  }

  /**
   * Backfill: fetch accurate GPS coordinates from Google Places for every
   * active place that is missing latitude or longitude.
   */
  /**
   * @param force true = update ALL places (override existing coords)
   *              false = only places missing lat/lng (default)
   */
  async backfillCoordinates(force = false): Promise<{
    total: number;
    updated: number;
    notFound: number;
    failed: number;
  }> {
    this.imageFetcher.clearMissCache();

    const qb = this.placeRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.city', 'city')
      .where('p.isActive = true');

    // In force mode: update every place. Otherwise: only ones without coords.
    if (!force) {
      qb.andWhere('(p.latitude IS NULL OR p.longitude IS NULL OR p.latitude = 0 OR p.longitude = 0)');
    }

    const places = await qb.orderBy('p.createdAt', 'ASC').getMany();

    const total = places.length;
    let updated  = 0;
    let notFound = 0;
    let failed   = 0;

    const BATCH    = 5;
    const DELAY_MS = 300;

    for (let i = 0; i < places.length; i += BATCH) {
      const batch = places.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map((p) =>
          this.imageFetcher.enrichCoordinates({
            id:   p.id,
            name: p.name,
            city: p.city ? { name: p.city.name } : undefined,
          }),
        ),
      );

      for (const r of results) {
        if (r.status === 'rejected') failed++;
        else if (r.value) updated++;
        else notFound++;
      }

      if (i + BATCH < places.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    this.clearReadCache();
    return { total, updated, notFound, failed };
  }

  /**
   * Backfill: fetch real Google Places images for every active place that has
   * no imageUrl. Processes in batches to respect API rate limits.
   * Returns counts so the caller can report progress.
   */
  async backfillMissingImages(): Promise<{
    total: number;
    updated: number;
    notFound: number;
    failed: number;
  }> {
    // Reset the miss cache so previously-broken attempts are retried
    this.imageFetcher.clearMissCache();

    // Load all active places without a fresh CDN image.
    // Also includes legacy googleapis.com photo URLs (expired / API-key-exposing).
    const places = await this.placeRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.city', 'city')
      .where('p.isActive = true')
      .andWhere(
        "(p.imageUrl IS NULL OR p.imageUrl = '' OR p.imageUrl LIKE '%googleapis.com/maps/api/place/photo%')",
      )
      .orderBy('p.createdAt', 'ASC')
      .getMany();

    const total = places.length;
    let updated = 0;
    let notFound = 0;
    let failed = 0;

    const BATCH = 4;   // smaller batch — multiple providers per place
    const DELAY_MS = 500;

    for (let i = 0; i < places.length; i += BATCH) {
      const batch = places.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (p) => {
          // Strategy 1: full provider chain (Wikipedia, Wikimedia, Google Custom Search, Unsplash…)
          const imageUrl = await this.placeImageService.getPrimaryImage(
            p.name,
            p.city?.name,
            p.type,
          );

          if (imageUrl) {
            await this.placeRepo.update(p.id, { imageUrl });
            return imageUrl;
          }

          // Strategy 2: legacy Google Places fetcher (if key ever gets fixed)
          return this.imageFetcher.ensureImage({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl ?? undefined,
            city: p.city ? { name: p.city.name ?? undefined } : undefined,
          });
        }),
      );

      for (const r of results) {
        if (r.status === 'rejected') failed++;
        else if (r.value) updated++;
        else notFound++;
      }

      if (i + BATCH < places.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // Invalidate list cache so the next Explore request picks up the new images
    this.clearReadCache();

    return { total, updated, notFound, failed };
  }

  async create(createPlaceDto: CreatePlaceDto) {
    const { provider, city, tags, ...rest } = createPlaceDto;
    const place = this.placeRepo.create({
      ...rest,
      provider: provider ? ({ id: provider } as Provider) : undefined,
      city: { id: city } as City,
      tags: tags?.map((id) => ({ id })) as Tag[] | undefined,
    });
    const saved = await this.placeRepo.save(place);
    this.clearReadCache();
    return saved;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    country?: string,
    city?: string,
    cursor?: string,
    q?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const cacheKey = [
      'places:list',
      String(page),
      String(safeLimit),
      this.normalizeQueryPart(country),
      this.normalizeQueryPart(city),
      this.normalizeQueryPart(q),
      cursor?.trim() ?? '',
    ].join(':');

    return this.readCache.getOrSet(
      cacheKey,
      this.listCacheTtlMs(),
      async () => {
        const cityIds = await this.resolveCityIds(country, city);
        if (cityIds && cityIds.length === 0) {
          return {
            data: [],
            total: 0,
            page,
            lastPage: 0,
            nextCursor: null,
            hasMore: false,
          };
        }

        const cursorToken = decodeCursor(cursor);
        const baseQuery = this.placeRepo
          .createQueryBuilder('place')
          .where('place.isActive = true');

        const normalizedQ = this.normalizeQueryPart(q);
        if (normalizedQ) {
          baseQuery.andWhere(
            '(place.name ILIKE :q OR place.description ILIKE :q)',
            { q: `%${normalizedQ}%` },
          );
        }

        if (cityIds) {
          baseQuery.andWhere('place.cityId IN (:...cityIds)', { cityIds });
        }

        if (cursorToken) {
          applyDescendingCursor(baseQuery, 'place', cursorToken);
        }

        const total = cursorToken ? null : await baseQuery.clone().getCount();

        const pageQuery = baseQuery
          .clone()
          .select('place.id', 'id')
          .addSelect('place.name', 'name')
          .addSelect('place.slug', 'slug')
          .addSelect('place.description', 'description')
          .addSelect('place.type', 'type')
          .addSelect('place.latitude', 'latitude')
          .addSelect('place.longitude', 'longitude')
          .addSelect('place.ratingAverage', 'ratingAverage')
          .addSelect('place.ratingCount', 'ratingCount')
          .addSelect('place.isActive', 'isActive')
          .addSelect('place.isVerified', 'isVerified')
          .addSelect('place.imageUrl', 'imageUrl')
          .addSelect('place.createdAt', 'createdAt')
          .addSelect('place.cityId', 'cityId')
          .addSelect('place.providerId', 'providerId')
          .orderBy('place.createdAt', 'DESC')
          .addOrderBy('place.id', 'DESC');

        if (!cursorToken) {
          pageQuery.skip((page - 1) * safeLimit);
        }

        const rows = await pageQuery.take(safeLimit + 1).getRawMany();

        const hasMore = rows.length > safeLimit;
        const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
        const places = await this.loadPlacesRelations(pageRows);
        void this.ensurePlaceImages(places).catch(() => undefined);

        return {
          data: places,
          total,
          page,
          lastPage:
            cursorToken || total == null
              ? undefined
              : Math.ceil(total / safeLimit),
          nextCursor:
            hasMore && pageRows.length > 0
              ? encodeCursor(pageRows[pageRows.length - 1])
              : null,
          hasMore,
        };
      },
    );
  }

  /**
   * Active places nearest to a point (Haversine). Sorted in-process so we avoid TypeORM/raw-SQL
   * orderBy quirks with aliases. Capped fetch keeps this safe for typical catalog sizes.
   */
  async findNearest(lat: number, lng: number, limit: number = 5) {
    const safeLimit = Math.min(Math.max(limit, 1), 25);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    const cacheKey = [
      'places:nearest',
      lat.toFixed(4),
      lng.toFixed(4),
      String(safeLimit),
    ].join(':');

    return this.readCache.getOrSet(
      cacheKey,
      this.nearestCacheTtlMs(),
      async () => {
        const maxScan = 2500;
        const rows = await this.placeRepo.find({
          where: { isActive: true },
          relations: ['city'],
          take: maxScan,
          order: { createdAt: 'DESC' },
        });

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000;

        const withDistance = rows.map((pl) => {
          const plat = Number(pl.latitude);
          const plng = Number(pl.longitude);
          const inner = Math.min(
            1,
            Math.max(
              -1,
              Math.cos(toRad(lat)) *
                Math.cos(toRad(plat)) *
                Math.cos(toRad(plng) - toRad(lng)) +
                Math.sin(toRad(lat)) * Math.sin(toRad(plat)),
            ),
          );
          const meters = R * Math.acos(inner);
          return {
            pl,
            meters: Number.isFinite(meters) ? meters : Number.POSITIVE_INFINITY,
          };
        });

        withDistance.sort((a, b) => a.meters - b.meters);
        const nearestPlaces = withDistance.slice(0, safeLimit).map((x) => x.pl);
        await this.ensurePlaceImages(nearestPlaces);
        return nearestPlaces;
      },
    );
  }

  async findOne(idOrSlug: string) {
    const key = idOrSlug.trim().toLowerCase();
    const cacheKey = `places:detail:${key}`;

    return this.readCache.getOrSet(
      cacheKey,
      this.detailCacheTtlMs(),
      async () => {
        const place = await this.placeRepo.findOne({
          where: isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
          relations: ['city', 'provider', 'tags', 'pricings', 'openingHours'],
        });

        if (!place) {
          throw new NotFoundException(`Place not found`);
        }

        await this.ensurePlaceImage(place);
        return place;
      },
    );
  }

  async update(id: string, updatePlaceDto: UpdatePlaceDto) {
    const place = await this.placeRepo.findOne({
      where: { id },
      relations: ['city', 'provider', 'tags', 'pricings', 'openingHours'],
    });
    if (!place) {
      throw new NotFoundException(`Place not found`);
    }

    const { provider, city, tags, ...rest } = updatePlaceDto;
    Object.assign(place, rest);

    if (provider) {
      place.provider = { id: provider } as Provider;
    }

    if (city) {
      place.city = { id: city } as City;
    }

    if (tags !== undefined) {
      place.tags = tags.map((id) => ({ id })) as Tag[];
    }

    const saved = await this.placeRepo.save(place);
    this.clearReadCache();
    return saved;
  }

  async remove(id: string) {
    const place = await this.placeRepo.findOne({ where: { id } });
    if (!place) {
      throw new NotFoundException(`Place not found`);
    }

    await this.placeRepo.softDelete(place.id);
    this.clearReadCache();

    return {
      message: 'Place deleted successfully',
    };
  }
}
