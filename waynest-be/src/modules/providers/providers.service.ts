import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CitiesService } from '../cities/cities.service';
import { ProviderMembershipService } from '../provider-membership/provider-membership.service';
import { User } from '../users/entities/user.entity';
import slugify from 'slugify';
import { Place } from '../place/entities/place.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../review/entities/review.entity';
import { Event } from '../event/entities/event.entity';

type ReviewStats = {
  count: string | null;
  avg: string | null;
};

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
    private readonly citiesService: CitiesService,
    private readonly membershipService: ProviderMembershipService,
  ) {}

  async create(dto: CreateProviderDto, user: User) {
    let slug = slugify(dto.displayName, {
      lower: true,
      strict: true,
    });

    const existing = await this.repo.findOne({ where: { slug } });

    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const city = await this.citiesService.findByName(dto.city);

    if (!city) {
      throw new NotFoundException(`City "${dto.city}" not found`);
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

  async findAll() {
    return await this.repo.find({
      relations: ['city', 'owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const provider = await this.repo.findOne({
      where: { id },
      relations: ['city', 'owner'],
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async findPublicBySlug(slug: string) {
    const provider = await this.repo.findOne({
      where: { slug },
      relations: ['city', 'owner'],
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
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

  async findMyPlaces(userId: string) {
    const provider = await this.findByUser(userId);
    const placeRepo = this.repo.manager.getRepository(Place);

    return await placeRepo.find({
      where: { provider: { id: provider.id } },
      relations: ['city', 'provider', 'tags'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMyEvents(userId: string) {
    const provider = await this.findByUser(userId);
    const eventRepo = this.repo.manager.getRepository(Event);

    return await eventRepo.find({
      where: { venue: { provider: { id: provider.id } } },
      relations: ['venue', 'venue.provider'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateOwnProfile(userId: string, dto: UpdateProviderDto) {
    const provider = await this.findByUser(userId);
    const safeUpdate: UpdateProviderDto = {
      displayName: dto.displayName,
      phone: dto.phone,
      providerType: dto.providerType,
      secondaryPhone: dto.secondaryPhone,
      slug: dto.slug,
      website: dto.website,
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
