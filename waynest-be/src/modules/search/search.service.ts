import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';
import { BlockRelation } from '../social-graph/entities/block-relation.entity';

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
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Provider) private readonly providersRepo: Repository<Provider>,
    @InjectRepository(Place) private readonly placesRepo: Repository<Place>,
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(BlockRelation)
    private readonly blocksRepo: Repository<BlockRelation>,
  ) {}

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

  private async blockedUserIds(viewerId: string | undefined): Promise<string[]> {
    if (!viewerId) {
      return [];
    }
    const rows = await this.blocksRepo
      .createQueryBuilder('b')
      .where('b.blockerId = :v OR b.blockedId = :v', { v: viewerId })
      .getMany();
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
    const types = this.parseTypes(typesRaw);
    const safeLimit = Math.min(Math.max(limitPerType, 1), 20);
    const ilike = `%${term}%`;
    const blocked = await this.blockedUserIds(viewerId);

    const items: SearchHit[] = [];

    if (types.includes('user')) {
      const qb = this.usersRepo
        .createQueryBuilder('u')
        .where('u.isSearchVisible = true')
        .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('u.role IN (:...roles)', { roles: [UserRole.USER, UserRole.PROVIDER] })
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
      const users = await qb.getMany();
      for (const u of users) {
        items.push({
          type: 'user',
          href: `/u/${encodeURIComponent(u.username)}`,
          imageUrl: u.avatarUrl ?? null,
          subtitle: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
          title: u.username,
        });
      }
    }

    if (types.includes('provider')) {
      const qb = this.providersRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.city', 'city')
        .where('p.isActive = true')
        .andWhere(
          new Brackets((w) => {
            w.where('p.displayName ILIKE :ilike', { ilike })
              .orWhere('p.slug ILIKE :ilike', { ilike });
          }),
        )
        .orderBy('p.displayName', 'ASC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('city.id = :cityId', { cityId });
      }
      if (blocked.length) {
        qb.andWhere('(p.ownerUserId IS NULL OR p.ownerUserId NOT IN (:...blocked))', {
          blocked,
        });
      }
      const providers = await qb.getMany();
      for (const p of providers) {
        items.push({
          type: 'provider',
          href: `/p/${encodeURIComponent(p.slug)}`,
          imageUrl: null,
          subtitle: p.city?.name ?? null,
          title: p.displayName,
        });
      }
    }

    if (types.includes('place')) {
      const qb = this.placesRepo
        .createQueryBuilder('pl')
        .leftJoinAndSelect('pl.city', 'city')
        .where('pl.isActive = true')
        .andWhere(
          new Brackets((w) => {
            w.where('pl.name ILIKE :ilike', { ilike }).orWhere('pl.slug ILIKE :ilike', { ilike });
          }),
        )
        .orderBy('pl.name', 'ASC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('city.id = :cityId', { cityId });
      }
      const places = await qb.getMany();
      for (const pl of places) {
        items.push({
          type: 'place',
          href: `/places/${encodeURIComponent(pl.slug)}`,
          cityId: pl.city?.id ?? null,
          imageUrl: pl.imageUrl ?? null,
          subtitle: pl.city?.name ?? null,
          title: pl.name,
        });
      }
    }

    if (types.includes('event')) {
      const qb = this.eventsRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.venue', 'venue')
        .leftJoinAndSelect('venue.city', 'vcity')
        .where('e.isActive = true')
        .andWhere('e.slug IS NOT NULL')
        .andWhere('e.title ILIKE :ilike', { ilike })
        .orderBy('e.startDate', 'DESC')
        .take(safeLimit);
      if (cityId) {
        qb.andWhere('vcity.id = :cityId', { cityId });
      }
      const events = await qb.getMany();
      for (const e of events) {
        if (!e.slug) {
          continue;
        }
        items.push({
          type: 'event',
          href: `/events/${encodeURIComponent(e.slug)}`,
          imageUrl: venueImage(e),
          subtitle: e.venue?.city?.name ?? e.venue?.name ?? null,
          title: e.title,
        });
      }
    }

    return { items };
  }
}

function venueImage(e: Event): string | null {
  const v = e.venue as Place | undefined;
  return v?.imageUrl ?? null;
}
