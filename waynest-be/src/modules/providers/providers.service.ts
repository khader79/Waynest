import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import slugify from 'slugify';
import { Provider, VerificationStatusEnum } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CitiesService } from '../cities/cities.service';
import { ProviderMembershipService } from '../provider-membership/provider-membership.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Place } from '../place/entities/place.entity';
import { City } from '../cities/entities/city.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Event } from '../event/entities/event.entity';
import { EventService } from '../event/event.service';
import { Review, ReviewStatus } from '../review/entities/review.entity';

import {
  CreateProviderPlaceDto,
  ProviderPlaceOpeningHourItemDto,
  ProviderPlacePricingItemDto,
} from './dto/create-provider-place.dto';
import { UpdateProviderPlaceDto } from './dto/update-provider-place.dto';
import {
  PlaceVerificationRequest,
  PlaceVerificationRequestStatus,
} from './entities/place-verification-request.entity';
import { PlaceOpeningHour } from '../place-opening-hours/entities/place-opening-hour.entity';
import { PlacePricing } from '../placepricing/entities/placepricing.entity';
import { CreateProviderEventDto } from './dto/create-provider-event.dto';
import { UpdateProviderEventDto } from './dto/update-provider-event.dto';
import { MediaService } from '../upload/media.service';
import { SocialGraphService } from '../social-graph/social-graph.service';

type ReviewStats = {
  count: string | null;
  avg: string | null;
};

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(PlaceOpeningHour)
    private readonly placeOpeningHourRepo: Repository<PlaceOpeningHour>,
    @InjectRepository(PlacePricing)
    private readonly placePricingRepo: Repository<PlacePricing>,
    @InjectRepository(PlaceVerificationRequest)
    private readonly verificationRepo: Repository<PlaceVerificationRequest>,
    private readonly citiesService: CitiesService,
    private readonly membershipService: ProviderMembershipService,
    private readonly eventService: EventService,
    private readonly mediaService: MediaService,
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async getCitiesList() {
    return this.citiesService.findAll(1, 1000);
  }

  async create(dto: CreateProviderDto, user: User) {
    if (!dto.displayName?.trim()) {
      throw new BadRequestException(
        'Display name is required and cannot be empty',
      );
    }
    if (!dto.phone?.trim()) {
      throw new BadRequestException('Phone is required and cannot be empty');
    }
    if (!dto.city?.trim()) {
      throw new BadRequestException('City is required and cannot be empty');
    }

    let slug = slugify(dto.displayName.trim(), {
      lower: true,
      strict: true,
    });

    const existing = await this.repo.findOne({ where: { slug } });

    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const city = await this.citiesService.findByName(dto.city.trim());

    if (!city) {
      throw new NotFoundException(
        `City "${dto.city.trim()}" not found. Please check city name spelling.`,
      );
    }

    const { description, categories, ...rest } = dto;
    const provider = this.repo.create({
      ...rest,
      slug,
      city,
      owner: user,
      ownerUserId: user.id,
      description: description ?? null,
      categories: categories?.length ? categories : null,
    });

    const savedProvider = await this.repo.save(provider);

    await this.membershipService.createOwnerMembership(user, savedProvider);

    return savedProvider;
  }

  /**
   * Creates a verified provider from an approved application: transactional
   * provider row + owner membership + promotes user to PROVIDER.
   */
  async createApprovedFromApplication(
    dto: CreateProviderDto,
    userId: string,
  ): Promise<Provider> {
    return await this.repo.manager.transaction(
      async (manager: EntityManager) => {
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          throw new NotFoundException('User not found');
        }
        if (user.role !== UserRole.USER) {
          throw new BadRequestException(
            'Only accounts with role USER can receive provider approval',
          );
        }

        const ownerTaken = await manager.getRepository(Provider).exist({
          where: { ownerUserId: userId },
        });
        if (ownerTaken) {
          throw new BadRequestException(
            'This user already owns a provider profile',
          );
        }

        let slug = slugify(dto.displayName, {
          lower: true,
          strict: true,
        });

        const existing = await manager.getRepository(Provider).findOne({
          where: { slug },
        });

        if (existing) {
          slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
        }

        const city = await this.citiesService.findByName(dto.city);

        if (!city) {
          throw new NotFoundException(`City "${dto.city}" not found`);
        }

        const { description, categories, ...rest } = dto;
        const provider = manager.getRepository(Provider).create({
          ...rest,
          slug,
          city,
          owner: user,
          ownerUserId: user.id,
          description: description ?? null,
          categories: categories?.length ? categories : null,
          verificationStatus: VerificationStatusEnum.VERIFIED,
          isActive: dto.isActive ?? true,
        });

        const savedProvider = await manager
          .getRepository(Provider)
          .save(provider);

        await this.membershipService.createOwnerMembershipWithManager(
          manager,
          user,
          savedProvider,
        );

        user.role = UserRole.PROVIDER;
        await manager.getRepository(User).save(user);

        return savedProvider;
      },
    );
  }

  async findAll() {
    return await this.repo.find({
      relations: ['city', 'owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const provider = await this.repo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.city', 'city')
      .leftJoinAndSelect('provider.owner', 'owner')
      .where('provider.id = :id', { id })
      .getOne();

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async findPublicBySlug(slug: string) {
    const provider = await this.repo.findOne({
      where: {
        slug,
        verificationStatus: VerificationStatusEnum.VERIFIED,
        isActive: true,
      },
      relations: ['city', 'owner'],
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  /** Resolve verified public provider by UUID or slug */
  private async resolvePublicProvider(param: string): Promise<Provider> {
    const key = param.trim();
    if (isUuid(key)) {
      const provider = await this.repo.findOne({
        where: {
          id: key,
          verificationStatus: VerificationStatusEnum.VERIFIED,
          isActive: true,
        },
        relations: ['city', 'owner'],
      });
      if (!provider) {
        throw new NotFoundException('Provider not found');
      }
      return provider;
    }
    return this.findPublicBySlug(key);
  }

  /**
   * Single payload for public business page: profile, listings, upcoming events,
   * aggregate stats, recent reviews.
   */
  async findPublicProfileAggregate(param: string) {
    const provider = await this.resolvePublicProvider(param);

    const places = await this.placeRepo.find({
      where: { provider: { id: provider.id }, isActive: true },
      relations: ['city', 'tags'],
      order: { createdAt: 'DESC' },
      take: 60,
    });

    const now = new Date();
    const upcomingEvents = await this.eventRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.venue', 'venue')
      .where('venue.providerId = :pid', { pid: provider.id })
      .andWhere('e.endDate >= :now', { now })
      .orderBy('e.startDate', 'ASC')
      .take(30)
      .getMany();

    const stats = await this.getStats(provider.id);

    const reviewRows = await this.reviewRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.place', 'place')
      .leftJoinAndSelect('r.user', 'user')
      .where('place.providerId = :pid', { pid: provider.id })
      .andWhere('r.status = :st', { st: ReviewStatus.APPROVED })
      .orderBy('r.createdAt', 'DESC')
      .take(20)
      .getMany();

    const reviews = reviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt,
      placeId: r.placeId,
      placeName: r.place?.name ?? null,
      user: r.user
        ? {
            id: r.user.id,
            username: r.user.username,
            avatarUrl: this.mediaService.publicUploadRef(r.user.avatarUrl),
          }
        : null,
    }));

    let ownerSocial: {
      followersCount: number;
      followingCount: number;
    } | null = null;
    if (provider.ownerUserId) {
      const [followersCount, followingCount] = await Promise.all([
        this.socialGraphService.countFollowers(provider.ownerUserId),
        this.socialGraphService.countFollowing(provider.ownerUserId),
      ]);
      ownerSocial = { followersCount, followingCount };
    }

    return {
      provider,
      places,
      upcomingEvents,
      stats,
      reviews,
      ownerSocial,
      /** Explicit UUID for follow/unfollow (some clients omit nested owner). */
      followTargetUserId: provider.ownerUserId ?? null,
    };
  }

  async findSlugByOwnerUserId(ownerUserId: string): Promise<string | null> {
    const row = await this.repo.findOne({
      where: { ownerUserId },
      select: ['slug'],
    });
    return row?.slug ?? null;
  }

  async update(id: string, dto: UpdateProviderDto) {
    const provider = await this.findOne(id);

    if (dto.city) {
      const city = await this.citiesService.findByName(dto.city);

      if (!city) {
        throw new Error(`City "${dto.city}" not found`);
      }

      provider.city = city;
    }

    Object.assign(provider, dto);

    await this.repo.save(provider);

    return provider;
  }

  async remove(id: string) {
    const provider = await this.findOne(id);
    return await this.repo.softDelete(provider.id);
  }

  async findByUser(userId: string) {
    const provider = await this.repo
      .createQueryBuilder('provider')
      .innerJoin('provider.memberships', 'membership')
      .innerJoin('membership.user', 'user')
      .leftJoinAndSelect('provider.city', 'city')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  private padTimeForDb(value: string): string {
    const v = value.trim();
    if (/^\d{2}:\d{2}$/.test(v)) {
      return `${v}:00`.slice(0, 8);
    }
    return v.slice(0, 8);
  }

  private dedupeOpeningHours(rows: ProviderPlaceOpeningHourItemDto[]) {
    const map = new Map<number, ProviderPlaceOpeningHourItemDto>();
    for (const r of rows) {
      map.set(r.dayOfWeek, r);
    }
    return [...map.values()].sort(
      (a, b) => (a.dayOfWeek ?? -1) - (b.dayOfWeek ?? -1),
    );
  }

  private normalizePlaceImageUrl(raw?: string): string | undefined {
    if (!raw?.trim()) {
      return undefined;
    }
    const t = raw.trim();
    return this.mediaService.toRelativeUploadPath(t) ?? t;
  }

  private async syncOpeningHoursForPlace(
    placeId: string,
    rows: ProviderPlaceOpeningHourItemDto[] | undefined,
  ) {
    if (rows === undefined) {
      return;
    }
    await this.placeOpeningHourRepo.delete({ placeId });
    const list = this.dedupeOpeningHours(rows);
    if (list.length === 0) {
      return;
    }
    const entities = list.map((r) =>
      this.placeOpeningHourRepo.create({
        placeId,
        dayOfWeek: r.dayOfWeek,
        openTime: this.padTimeForDb(r.openTime),
        closeTime: this.padTimeForDb(r.closeTime),
      }),
    );
    await this.placeOpeningHourRepo.save(entities);
  }

  private async syncPricingsForPlace(
    placeId: string,
    rows: ProviderPlacePricingItemDto[] | undefined,
  ) {
    if (rows === undefined) {
      return;
    }
    await this.placePricingRepo.delete({ placeId });
    if (rows.length === 0) {
      return;
    }
    const entities = rows.map((r) =>
      this.placePricingRepo.create({
        placeId,
        basePrice: r.basePrice,
        currencyCode: r.currencyCode.trim().toUpperCase(),
        perPerson: r.perPerson ?? false,
        maxPeople: r.maxPeople,
        validFrom: r.validFrom ? new Date(r.validFrom) : undefined,
        validTo: r.validTo ? new Date(r.validTo) : undefined,
      }),
    );
    await this.placePricingRepo.save(entities);
  }

  private async loadPlaceForProviderResponse(placeId: string) {
    const place = await this.placeRepo.findOne({
      where: { id: placeId },
      relations: ['city', 'provider', 'tags', 'openingHours', 'pricings'],
    });
    if (place?.openingHours?.length) {
      place.openingHours.sort(
        (a, b) => (a.dayOfWeek ?? -1) - (b.dayOfWeek ?? -1),
      );
    }
    return place;
  }

  async findMyPlaces(userId: string) {
    const provider = await this.findByUser(userId);

    const places = await this.placeRepo.find({
      where: { provider: { id: provider.id } },
      relations: ['city', 'provider', 'tags', 'openingHours', 'pricings'],
      order: { createdAt: 'DESC' },
    });
    for (const p of places) {
      p.openingHours?.sort((a, b) => (a.dayOfWeek ?? -1) - (b.dayOfWeek ?? -1));
    }
    // Attach whether a verification request is pending for each place
    try {
      const placeIds = places.map((p) => p.id);
      if (placeIds.length) {
        const pending = await this.verificationRepo.find({
          where: {
            placeId: In(placeIds),
            status: PlaceVerificationRequestStatus.PENDING,
          },
        });
        const pendingSet = new Set(pending.map((r) => r.placeId));
        for (const p of places) {
          // attach transient property for API consumers
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          p.verificationRequested = pendingSet.has(p.id);
        }
      }
    } catch {
      // non-fatal: ignore verification request attachment failures
    }
    return places;
  }

  async findMyEvents(userId: string) {
    const provider = await this.findByUser(userId);

    return await this.eventRepo.find({
      where: { venue: { provider: { id: provider.id } } },
      relations: ['venue', 'venue.provider'],
      order: { createdAt: 'DESC' },
    });
  }

  async createMyPlace(userId: string, dto: CreateProviderPlaceDto) {
    const provider = await this.findByUser(userId);
    await this.citiesService.findOne(dto.cityId);

    let slug =
      dto.slug?.trim() ||
      slugify(dto.name, {
        lower: true,
        strict: true,
      });
    let dup = await this.placeRepo.findOne({ where: { slug } });
    if (dup) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      dup = await this.placeRepo.findOne({ where: { slug } });
      if (dup) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      }
    }

    let tags: Tag[] | undefined;
    if (dto.tagIds?.length) {
      tags = await this.tagRepo.findBy({ id: In(dto.tagIds) });
    }

    const place = this.placeRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      type: dto.type,
      latitude: dto.latitude,
      longitude: dto.longitude,
      provider: { id: provider.id } as Provider,
      city: { id: dto.cityId } as City,
      tags: tags?.length ? tags : undefined,
      ratingAverage: 0,
      ratingCount: 0,
      isActive: dto.isActive ?? true,
      isVerified: false,
      imageUrl: this.normalizePlaceImageUrl(dto.imageUrl),
    });

    const saved = await this.placeRepo.save(place);
    await this.syncOpeningHoursForPlace(saved.id, dto.openingHours);
    await this.syncPricingsForPlace(saved.id, dto.pricings);
    return (await this.loadPlaceForProviderResponse(saved.id)) ?? saved;
  }

  async updateMyPlace(
    userId: string,
    placeId: string,
    dto: UpdateProviderPlaceDto,
  ) {
    const provider = await this.findByUser(userId);
    const place = await this.placeRepo.findOne({
      where: { id: placeId },
      relations: ['provider', 'tags', 'city'],
    });

    if (!place || place.provider.id !== provider.id) {
      throw new ForbiddenException('Place not found');
    }

    if (dto.cityId !== undefined) {
      await this.citiesService.findOne(dto.cityId);
      place.city = { id: dto.cityId } as City;
    }

    if (dto.name !== undefined) place.name = dto.name;
    if (dto.description !== undefined) place.description = dto.description;
    if (dto.type !== undefined) place.type = dto.type;
    if (dto.latitude !== undefined) place.latitude = dto.latitude;
    if (dto.longitude !== undefined) place.longitude = dto.longitude;
    if (dto.isActive !== undefined) place.isActive = dto.isActive;
    if (dto.imageUrl !== undefined) {
      place.imageUrl = dto.imageUrl.trim()
        ? this.normalizePlaceImageUrl(dto.imageUrl)
        : undefined;
    }

    if (dto.slug !== undefined && dto.slug.trim()) {
      const nextSlug = dto.slug.trim();
      const clash = await this.placeRepo.findOne({
        where: { slug: nextSlug },
      });
      if (clash && clash.id !== place.id) {
        throw new BadRequestException('Slug already in use');
      }
      place.slug = nextSlug;
    }

    if (dto.tagIds !== undefined) {
      place.tags = dto.tagIds.length
        ? await this.tagRepo.findBy({ id: In(dto.tagIds) })
        : [];
    }

    const saved = await this.placeRepo.save(place);
    await this.syncOpeningHoursForPlace(saved.id, dto.openingHours);
    await this.syncPricingsForPlace(saved.id, dto.pricings);
    return (await this.loadPlaceForProviderResponse(saved.id)) ?? saved;
  }

  async requestPlaceVerification(userId: string, placeId: string) {
    const provider = await this.findByUser(userId);
    const place = await this.placeRepo.findOne({
      where: { id: placeId },
      relations: ['provider'],
    });

    if (!place || place.provider.id !== provider.id) {
      throw new ForbiddenException('Place not found');
    }

    const existing = await this.verificationRepo.findOne({
      where: { placeId, status: PlaceVerificationRequestStatus.PENDING },
    });

    if (existing) {
      return existing;
    }

    const req = this.verificationRepo.create({
      placeId,
      requestedByUserId: userId,
      status: PlaceVerificationRequestStatus.PENDING,
    });

    await this.verificationRepo.save(req);
    return req;
  }

  // Admin: list verification requests (optionally filter by status)
  async listVerificationRequests(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    return await this.verificationRepo.find({
      where,
      relations: ['place', 'place.provider', 'requestedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // Admin: approve or reject a verification request
  async processVerificationRequest(requestId: string, approve: boolean) {
    const req = await this.verificationRepo.findOne({
      where: { id: requestId },
      relations: ['place'],
    });
    if (!req) {
      throw new NotFoundException('Verification request not found');
    }
    if (req.status !== PlaceVerificationRequestStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    req.status = approve
      ? PlaceVerificationRequestStatus.APPROVED
      : PlaceVerificationRequestStatus.REJECTED;
    await this.verificationRepo.save(req);

    if (approve && req.place) {
      req.place.isVerified = true;
      await this.placeRepo.save(req.place);
    }

    return req;
  }

  async createMyEvent(userId: string, dto: CreateProviderEventDto) {
    const provider = await this.findByUser(userId);
    const venue = await this.placeRepo.findOne({
      where: { id: dto.venueId },
      relations: ['provider'],
    });

    if (!venue?.provider || venue.provider.id !== provider.id) {
      throw new ForbiddenException('Venue does not belong to your business');
    }

    return await this.eventService.create({
      title: dto.title,
      description: dto.description,
      venue: dto.venueId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      availableTickets: dto.availableTickets,
      ticketPrice: dto.ticketPrice,
      currencyCode: dto.currencyCode.toUpperCase(),
      isActive: dto.isActive ?? true,
    });
  }

  async updateMyEvent(
    userId: string,
    eventId: string,
    dto: UpdateProviderEventDto,
  ) {
    const provider = await this.findByUser(userId);
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['venue', 'venue.provider'],
    });

    if (!event?.venue?.provider || event.venue.provider.id !== provider.id) {
      throw new ForbiddenException('Event not found');
    }

    if (dto.venueId !== undefined) {
      const venue = await this.placeRepo.findOne({
        where: { id: dto.venueId },
        relations: ['provider'],
      });
      if (!venue?.provider || venue.provider.id !== provider.id) {
        throw new ForbiddenException('Venue does not belong to your business');
      }
    }

    const { venueId, currencyCode, ...rest } = dto;
    return await this.eventService.update(eventId, {
      ...rest,
      ...(venueId !== undefined ? { venue: venueId } : {}),
      ...(currencyCode !== undefined
        ? { currencyCode: currencyCode.toUpperCase() }
        : {}),
    });
  }

  async updateOwnProfile(userId: string, dto: UpdateProviderDto) {
    const provider = await this.findByUser(userId);

    if (dto.displayName && !dto.displayName.trim()) {
      throw new BadRequestException('Display name cannot be empty');
    }
    if (dto.phone && !dto.phone.trim()) {
      throw new BadRequestException('Phone cannot be empty');
    }
    if (dto.city && !dto.city.trim()) {
      throw new BadRequestException('City cannot be empty');
    }

    const safeUpdate: UpdateProviderDto = {
      displayName: dto.displayName?.trim(),
      phone: dto.phone?.trim(),
      secondaryPhone: dto.secondaryPhone?.trim(),
      slug: dto.slug,
      website: dto.website,
      description: dto.description,
      categories: dto.categories,
      coverPhotoUrl: dto.coverPhotoUrl,
      logoUrl: dto.logoUrl,
      city: dto.city ? dto.city.trim() : undefined,
    };

    return await this.update(provider.id, safeUpdate);
  }

  async getStats(providerId: string) {
    const placeRepo = this.repo.manager.getRepository(Place);
    const bookingRepo = this.repo.manager.getRepository(Booking);
    const reviewRepo = this.repo.manager.getRepository(Review);

    const totalPlaces = await placeRepo.count({
      where: { provider: { id: providerId } },
    });

    const totalBookings = await bookingRepo
      .createQueryBuilder('booking')
      .innerJoin('booking.place', 'place', 'place.providerId = :providerId', {
        providerId,
      })
      .getCount();

    const reviewStats = await reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.place', 'place', 'place.providerId = :providerId', {
        providerId,
      })
      .select('COUNT(review.id)', 'count')
      .addSelect('AVG(review.rating)', 'avg')
      .getRawOne<ReviewStats>();

    const totalReviews = reviewStats?.count ? Number(reviewStats.count) : 0;
    const averageRating = reviewStats?.avg ? Number(reviewStats.avg) : 0;

    return {
      totalPlaces,
      totalBookings,
      totalReviews,
      averageRating,
    };
  }
}
function isUuid(key: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    key.trim(),
  );
}
