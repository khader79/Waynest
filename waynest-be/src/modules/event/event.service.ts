import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { Place } from '../place/entities/place.entity';
import slugify from 'slugify';
import { isUuid } from 'src/common/utils/id.util';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

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

  async findAll(page: number = 1, limit: number = 10) {
    limit = limit > 50 ? 50 : limit;

    const [events, total] = await this.eventRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['venue', 'venue.provider'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: events,
      total,
      page,
      lastPage: Math.ceil(total / limit),
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
