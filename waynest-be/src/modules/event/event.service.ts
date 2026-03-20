import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { Place } from '../place/entities/place.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto) {
    const { venue, ...rest } = createEventDto;
    const event = this.eventRepo.create({
      ...rest,
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
    const event = await this.eventRepo.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
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
    const event = await this.findOne(id);

    await this.eventRepo.softDelete(event.id);

    return {
      message: 'Event deleted successfully',
    };
  }
}
