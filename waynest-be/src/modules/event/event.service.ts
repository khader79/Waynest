import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { Place } from '../place/entities/place.entity';
import slugify from 'slugify';
import { isUuid } from 'src/common/utils/id.util';
import {
  applyDescendingCursor,
  decodeCursor,
  encodeCursor,
} from 'src/common/utils/cursor-pagination';
import { In } from 'typeorm';

type EventListRawRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string;
  availableTickets: number | string;
  ticketPrice: number | string;
  currencyCode: string;
  isActive: boolean;
  createdAt: Date | string;
  venueId: string;
};

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  private async loadVenues(venueIds: string[]) {
    if (venueIds.length === 0) {
      return new Map<string, Place>();
    }

    const venues = await this.placeRepo.find({
      where: { id: In(venueIds) },
      relations: ['city'],
    });

    return new Map(venues.map((venue) => [venue.id, venue]));
  }

  async create(createEventDto: CreateEventDto) {
    const { venue, ...rest } = createEventDto;
    let slug = slugify(rest.title ?? 'event', { lower: true, strict: true });
    const dup = await this.eventRepo.findOne({ where: { slug } });
    if (dup) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
    }
    const event = this.eventRepo.create({
      ...rest,
      slug,
      venue: { id: venue } as Place,
    });
    return await this.eventRepo.save(event);
  }

  async findAll(page: number = 1, limit: number = 10, cursor?: string) {
    limit = limit > 50 ? 50 : limit;

    const cursorToken = decodeCursor(cursor);
    const baseQuery = this.eventRepo.createQueryBuilder('event');

    if (cursorToken) {
      applyDescendingCursor(baseQuery, 'event', cursorToken);
    }

    const total = cursorToken ? null : await baseQuery.clone().getCount();

    const pageQuery = baseQuery
      .clone()
      .select('event.id', 'id')
      .addSelect('event.title', 'title')
      .addSelect('event.slug', 'slug')
      .addSelect('event.description', 'description')
      .addSelect('event.startDate', 'startDate')
      .addSelect('event.endDate', 'endDate')
      .addSelect('event.availableTickets', 'availableTickets')
      .addSelect('event.ticketPrice', 'ticketPrice')
      .addSelect('event.currencyCode', 'currencyCode')
      .addSelect('event.isActive', 'isActive')
      .addSelect('event.createdAt', 'createdAt')
      .addSelect('event.venueId', 'venueId')
      .orderBy('event.createdAt', 'DESC')
      .addOrderBy('event.id', 'DESC');

    if (!cursorToken) {
      pageQuery.skip((page - 1) * limit);
    }

    const rows = (await pageQuery
      .take(limit + 1)
      .getRawMany()) as EventListRawRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const venues = await this.loadVenues([
      ...new Set(pageRows.map((row) => row.venueId)),
    ]);

    const events = pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      startDate: row.startDate,
      endDate: row.endDate,
      availableTickets: row.availableTickets,
      ticketPrice: row.ticketPrice,
      currencyCode: row.currencyCode,
      isActive: row.isActive,
      createdAt: row.createdAt,
      venue: venues.get(row.venueId) ?? null,
    }));

    return {
      data: events,
      total,
      page,
      lastPage:
        cursorToken || total == null ? undefined : Math.ceil(total / limit),
      nextCursor:
        hasMore && pageRows.length > 0
          ? encodeCursor(pageRows[pageRows.length - 1])
          : null,
      hasMore,
    };
  }

  async findOne(id: string) {
    // Support both UUID id and human-friendly slug in the same endpoint.
    const where = isUuid(id) ? { id } : { slug: id };
    const event = await this.eventRepo.findOne({
      where,
      relations: ['venue', 'venue.provider'],
    });

    if (!event) {
      throw new NotFoundException(`Event not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const event = await this.findOne(id);

    const { venue, ...rest } = updateEventDto;
    Object.assign(event, rest);

    if (venue) {
      event.venue = { id: venue } as Place;
    }

    return await this.eventRepo.save(event);
  }

  async remove(id: string) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event not found`);
    }

    await this.eventRepo.softDelete(event.id);

    return {
      message: 'Event deleted successfully',
    };
  }
}
