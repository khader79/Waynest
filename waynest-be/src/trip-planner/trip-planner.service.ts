import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TripPlan } from './entities/trip-planner.entity';
import { CreateTripPlannerDto } from './dto/create-trip-planner.dto';
import { Place } from 'src/modules/place/entities/place.entity';
import { Event } from 'src/modules/event/entities/event.entity';

@Injectable()
export class TripPlannerService {
  constructor(
    @InjectRepository(TripPlan)
    private tripPlanRepo: Repository<TripPlan>,

    @InjectRepository(Place)
    private placeRepo: Repository<Place>,

    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
  ) {}

  async generate(userId: string, dto: CreateTripPlannerDto) {
    const places = await this.placeRepo.find({
      where: {
        city: { id: dto.cityId },
        isActive: true,
      },
      relations: ['pricings', 'openingHours', 'tags'],
    });

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + dto.days);

    const events = await this.eventRepo.find({
      where: {
        isActive: true,
        startDate: Between(today, endDate),
      },
      relations: ['venue'],
    });

    const filteredPlaces = dto.interests?.length
      ? places.filter((place) =>
          place.tags.some((tag) =>
            dto
              .interests!.map((i) => i.toLowerCase())
              .includes(tag.name.toLowerCase()),
          ),
        )
      : places;

    const budgetPerPersonPerDay = dto.budget / dto.persons / dto.days;

    const context = {
      cityId: dto.cityId,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      budgetPerPersonPerDay: Math.round(budgetPerPersonPerDay),
      places: filteredPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        rating: p.ratingAverage,
        tags: p.tags.map((t) => t.name),
        price: p.pricings[0]?.basePrice ?? 0,
        currency: p.pricings[0]?.currencyCode ?? 'USD',
        perPerson: p.pricings[0]?.perPerson ?? false,
        openingHours: p.openingHours.map((h) => ({
          day: h.dayOfWeek,
          open: h.openTime,
          close: h.closeTime,
        })),
      })),
      events: events.map((e) => ({
        id: e.id,
        name: e.title,
        price: e.ticketPrice,
        currency: e.currencyCode,
        startDate: e.startDate,
        endDate: e.endDate,
        venue: e.venue?.name,
      })),
    };

    console.log('context ready:', JSON.stringify(context, null, 2));
    return context;
  }
}
