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

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(PlacePricing)
    private readonly pricingRepo: Repository<PlacePricing>,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const place = await this.placeRepo.findOne({
      where: { id: dto.placeId },
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
    const totalCost = pricing.perPerson
      ? basePrice * dto.persons
      : basePrice;

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

    return await this.bookingRepo.save(booking);
  }

  async findByUser(userId: string) {
    return await this.bookingRepo.find({
      where: { userId },
      relations: { place: true },
      order: { bookingDate: 'DESC' },
    });
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

  async updateStatus(id: string, dto: UpdateBookingDto, role: UserRole) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const booking = await this.bookingRepo.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (dto.status) {
      booking.status = dto.status;
    }

    if (dto.notes !== undefined) {
      booking.notes = dto.notes ?? null;
    }

    return await this.bookingRepo.save(booking);
  }
}
