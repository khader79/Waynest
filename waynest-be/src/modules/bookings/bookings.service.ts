import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Place } from '../place/entities/place.entity';
import { PlacePricing } from '../placepricing/entities/placepricing.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ImageFetcherService } from '../../trip-planner/image-fetcher.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(PlacePricing)
    private readonly pricingRepo: Repository<PlacePricing>,
    private readonly notificationsService: NotificationsService,
    private readonly imageFetcher: ImageFetcherService,
  ) {}

  private async ensureBookingPlaceImage(booking: Booking | null | undefined) {
    if (!booking?.place) {
      return;
    }

    const imageUrl = await this.imageFetcher.ensureImage(booking.place);
    if (imageUrl) {
      booking.place.imageUrl = imageUrl;
    }
  }

  private async ensureBookingPlaceImages(bookings: Booking[]) {
    await Promise.all(
      bookings.map((booking) => this.ensureBookingPlaceImage(booking)),
    );
  }

  private queueNotification(
    input: Parameters<NotificationsService['createNotification']>[0],
  ) {
    void this.notificationsService
      .createNotification(input)
      .catch(() => undefined);
  }

  async create(userId: string, dto: CreateBookingDto) {
    const place = await this.placeRepo.findOne({
      where: { id: dto.placeId },
      relations: ['provider'],
    });

    if (!place) {
      throw new NotFoundException('Place not found');
    }

    const pricing = await this.pricingRepo.findOne({
      where: { place: { id: dto.placeId } },
      order: { createdAt: 'DESC' },
    });

    if (!pricing) {
      throw new NotFoundException('Pricing not found');
    }

    const basePrice = Number(pricing.basePrice);
    const totalCost = pricing.perPerson ? basePrice * dto.persons : basePrice;

    const booking = this.bookingRepo.create({
      userId,
      placeId: dto.placeId,
      bookingDate: new Date(dto.bookingDate),
      persons: dto.persons,
      totalCost,
      currencyCode: pricing.currencyCode,
      status: BookingStatus.PENDING,
      notes: dto.notes ?? null,
      place,
    });

    const saved = await this.bookingRepo.save(booking);
    if (
      place.provider &&
      place.provider.ownerUserId &&
      place.provider.ownerUserId !== userId
    ) {
      this.queueNotification({
        actorId: userId,
        recipientId: place.provider.ownerUserId,
        type: NotificationType.BOOKING_NEW,
        message: `New booking for ${place.name}`,
        meta: {
          bookingId: saved.id,
          placeId: place.id,
          placeSlug: place.slug,
        },
      });
    }
    return saved;
  }

  async findByUser(userId: string) {
    const bookings = await this.bookingRepo.find({
      where: { userId },
      relations: { place: true },
      order: { bookingDate: 'DESC' },
    });

    await this.ensureBookingPlaceImages(bookings);
    return bookings;
  }

  /** Bookings for places owned by this provider (owner user id). */
  async findByProviderOwner(ownerUserId: string) {
    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.place', 'place')
      .innerJoin('place.provider', 'provider')
      .where('provider.ownerUserId = :ownerUserId', { ownerUserId })
      .orderBy('booking.bookingDate', 'DESC')
      .getMany();

    await this.ensureBookingPlaceImages(bookings);
    return bookings;
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { place: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    await this.ensureBookingPlaceImage(booking);
    return booking;
  }

  async cancel(id: string, userId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    booking.status = BookingStatus.CANCELLED;

    return await this.bookingRepo.save(booking);
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingDto,
    userId: string,
    role: UserRole,
  ) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { place: { provider: true } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (role === UserRole.ADMIN) {
      // ok
    } else if (role === UserRole.PROVIDER) {
      const ownerId = booking.place?.provider?.ownerUserId;
      if (ownerId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    if (dto.status) {
      booking.status = dto.status;
    }

    if (dto.notes !== undefined) {
      booking.notes = dto.notes ?? null;
    }

    const saved = await this.bookingRepo.save(booking);
    const guestId = booking.userId;
    const actorForNotif = userId;
    if (guestId && guestId !== actorForNotif && dto.status) {
      this.queueNotification({
        actorId: actorForNotif,
        recipientId: guestId,
        type: NotificationType.BOOKING_STATUS,
        message: `Your booking status is now ${dto.status}`,
        meta: {
          bookingId: saved.id,
          placeId: saved.placeId,
          status: dto.status,
        },
      });
    }
    return saved;
  }
}
