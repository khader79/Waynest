import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import {
  Provider,
  VerificationStatusEnum,
} from '../providers/entities/provider.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';
import { BlockRelation } from '../social-graph/entities/block-relation.entity';
import { MediaService } from '../upload/media.service';
import { HotPathCache } from 'src/common/utils/hot-path-cache';
import { ImageFetcherService } from '../../trip-planner/image-fetcher.service';
import {
  getRedisClient,
  initializeRedisClient,
} from 'src/common/utils/redis-client';

export type SearchHitType = 'user' | 'provider' | 'place' | 'event';

export interface SearchHit {
  type: SearchHitType;
  title: string;
  subtitle: string | null;
  /** App-relative path (no UUID in human-facing segments where possible). */
  href: string;
  imageUrl?: string | null;
  /** For places: prefill trip planner city. */
  cityId?: string | null;
  /** For places: Waynest DB id and coordinates */
  placeId?: string;
  slug?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class SearchService {
  private readonly localCache = new HotPathCache(600);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Provider)
    private readonly providersRepo: Repository<Provider>,
    @InjectRepository(Place) private readonly placesRepo: Repository<Place>,
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(BlockRelation)
    private readonly blocksRepo: Repository<BlockRelation>,
    private readonly mediaService: MediaService,
    private readonly imageFetcher: ImageFetcherService,
  ) {}

  private getCacheTtl(): number {
    const v = process.env.SEARCH_CACHE_TTL_SECONDS;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 15;
  }

  private async ensureRedis() {
    try {
      await initializeRedisClient();
    } catch (_) {
      return;
    }
  }

  private parseTypes(raw?: string): SearchHitType[] {
    const all: SearchHitType[] = ['user', 'provider', 'place', 'event'];
    if (!raw?.trim()) {
      return all;
    }
    const set = new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const picked = all.filter((t) => set.has(t));
    return picked.length ? picked : all;
  }

  private async blockedUserIds(
    viewerId: string | undefined,
  ): Promise<string[]> {
    if (!viewerId) {
      return [];
    }
    const rows = await this.blocksRepo
      .createQueryBuilder('b')
      .select(['b.blockerId AS "blockerId"', 'b.blockedId AS "blockedId"'])
      .where('b.blockerId = :v OR b.blockedId = :v', { v: viewerId })
      .getRawMany<{ blockerId: string; blockedId: string }>();
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.blockerId === viewerId) {
        ids.add(r.blockedId);
      }
      if (r.blockedId === viewerId) {
        ids.add(r.blockerId);
      }
    }
    return [...ids];
  }

  async globalSearch(
    q: string,
    typesRaw: string | undefined,
    cityId: string | undefined,
    viewerId: string | undefined,
    limitPerType = 8,
  ): Promise<{ items: SearchHit[] }> {
    const term = q.trim();
    if (term.length < 2) {
      return { items: [] };
    }
    const types = this.parseTypes(typesRaw);
    const safeLimit = Math.min(Math.max(limitPerType, 1), 20);
    const ilike = `%${term}%`;
    const blocked = await this.blockedUserIds(viewerId);

    const redisKey = `search:global:${encodeURIComponent(
      term.toLowerCase(),
    )}:${types.join(',')}:${cityId ?? ''}:${safeLimit}`;

    const localCached = this.localCache.get<{ items: SearchHit[] }>(redisKey);
    if (localCached) {
      return localCached;
    }

    await this.ensureRedis();
    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(redisKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { items: SearchHit[] };
          this.localCache.set(redisKey, parsed, this.getCacheTtl() * 1000);
          return parsed;
        }
      } catch (_) {
        // ignore cache errors
      }
    }

    const items: SearchHit[] = [];

    if (types.includes('user')) {
      const qb = this.usersRepo
        .createQueryBuilder('u')
        .select([
          'u.username AS "username"',
          'u.firstName AS "firstName"',
          'u.lastName AS "lastName"',
          'u.avatarUrl AS "avatarUrl"',
        ])
        .where('u.isSearchVisible = true')
        .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('u.role IN (:...roles)', {
          roles: [UserRole.USER, UserRole.PROVIDER],
        })
        .andWhere(
          new Brackets((w) => {
            w.where('u.username ILIKE :ilike', { ilike })
              .orWhere('u.firstName ILIKE :ilike', { ilike })
              .orWhere('u.lastName ILIKE :ilike', { ilike });
          }),
        )
        .orderBy('u.username', 'ASC')
        .take(safeLimit);
      if (blocked.length) {
        qb.andWhere('u.id NOT IN (:...blocked)', { blocked });
      }
      const users = await qb.getRawMany<{
        username: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
      }>();
      for (const u of users) {
        items.push({
          type: 'user',
          href: `/u/${encodeURIComponent(u.username)}`,
          imageUrl: this.mediaService.publicUploadRef(u.avatarUrl),
          subtitle: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
          title: u.username,
        });
      }
    }

    if (types.includes('provider')) {
      const qb = this.providersRepo
        .createQueryBuilder('p')
        .leftJoin('p.city', 'city')
        .select([
          'p.displayName AS "displayName"',
          'p.slug AS "slug"',
          'city.name AS "cityName"',
        ])
        .where('p.isActive = true')
        .andWhere('p.verificationStatus = :provVerified', {
          provVerified: VerificationStatusEnum.VERIFIED,
        })
        .andWhere(
          new Brackets((w) => {
            w.where('p.displayName ILIKE :ilike', { ilike }).orWhere(
              'p.slug ILIKE :ilike',
              { ilike },
            );
          }),
        )
        .orderBy('p.displayName', 'ASC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('city.id = :cityId', { cityId });
      }
      if (blocked.length) {
        qb.andWhere(
          '(p.ownerUserId IS NULL OR p.ownerUserId NOT IN (:...blocked))',
          {
            blocked,
          },
        );
      }
      const providers = await qb.getRawMany<{
        displayName: string;
        slug: string;
        cityName: string | null;
      }>();
      for (const p of providers) {
        items.push({
          type: 'provider',
          href: `/p/${encodeURIComponent(p.slug)}`,
          imageUrl: null,
          subtitle: p.cityName ?? null,
          title: p.displayName,
        });
      }
    }

    if (types.includes('place')) {
      const qb = this.placesRepo
        .createQueryBuilder('pl')
        .leftJoin('pl.city', 'city')
        .select([
          'pl.id AS "id"',
          'pl.name AS "name"',
          'pl.slug AS "slug"',
          'pl.imageUrl AS "imageUrl"',
          'pl.latitude AS "latitude"',
          'pl.longitude AS "longitude"',
          'city.id AS "cityId"',
          'city.name AS "cityName"',
        ])
        .where('pl.isActive = true')
        .andWhere(
          new Brackets((w) => {
            w.where('pl.name ILIKE :ilike', { ilike }).orWhere(
              'pl.slug ILIKE :ilike',
              { ilike },
            );
          }),
        )
        .orderBy('pl.name', 'ASC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('city.id = :cityId', { cityId });
      }
      const places = await qb.getRawMany<{
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        latitude: number | string;
        longitude: number | string;
        cityId: string | null;
        cityName: string | null;
      }>();
      const placeHits = await Promise.all(
        places.map(async (pl) => {
          const resolvedImageUrl =
            (await this.imageFetcher.ensureImage({
              id: pl.id,
              name: pl.name,
              imageUrl: pl.imageUrl ?? undefined,
              city: { name: pl.cityName ?? undefined },
            })) ?? pl.imageUrl;

          return {
            type: 'place' as const,
            href: `/places/${encodeURIComponent(pl.slug)}`,
            cityId: pl.cityId ?? null,
            imageUrl: this.mediaService.publicUploadRef(resolvedImageUrl),
            subtitle: pl.cityName ?? null,
            title: pl.name,
            placeId: pl.id,
            slug: pl.slug,
            latitude: Number(pl.latitude),
            longitude: Number(pl.longitude),
          };
        }),
      );

      items.push(...placeHits);
    }

    if (types.includes('event')) {
      const qb = this.eventsRepo
        .createQueryBuilder('e')
        .leftJoin('e.venue', 'venue')
        .leftJoin('venue.city', 'vcity')
        .select([
          'e.title AS "title"',
          'e.slug AS "slug"',
          'venue.id AS "venueId"',
          'venue.name AS "venueName"',
          'venue.imageUrl AS "venueImageUrl"',
          'vcity.name AS "cityName"',
        ])
        .where('e.isActive = true')
        .andWhere('e.slug IS NOT NULL')
        .andWhere('e.title ILIKE :ilike', { ilike })
        .orderBy('e.startDate', 'DESC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('vcity.id = :cityId', { cityId });
      }
      const events = await qb.getRawMany<{
        title: string;
        slug: string | null;
        venueId: string | null;
        venueName: string | null;
        venueImageUrl: string | null;
        cityName: string | null;
      }>();
      for (const e of events) {
        if (!e.slug) {
          continue;
        }

        const resolvedVenueImageUrl = e.venueId
          ? await this.imageFetcher.ensureImage({
              id: e.venueId,
              name: e.venueName ?? e.title,
              imageUrl: e.venueImageUrl ?? undefined,
              city: { name: e.cityName ?? undefined },
            })
          : e.venueImageUrl;

        items.push({
          type: 'event',
          href: `/events/${encodeURIComponent(e.slug)}`,
          imageUrl: this.mediaService.publicUploadRef(
            resolvedVenueImageUrl ?? e.venueImageUrl,
          ),
          subtitle: e.cityName ?? e.venueName ?? null,
          title: e.title,
        });
      }
    }

    const result = { items };
    this.localCache.set(redisKey, result, this.getCacheTtl() * 1000);
    if (redis) {
      try {
        const ttl = this.getCacheTtl();
        await redis.setEx(redisKey, ttl, JSON.stringify(result));
      } catch (_) {
        // ignore cache set failures
      }
    }

    return result;
  }
}
