import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlacepricingDto } from './dto/create-placepricing.dto';
import { UpdatePlacepricingDto } from './dto/update-placepricing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacePricing } from './entities/placepricing.entity';
import { Place } from '../place/entities/place.entity';

@Injectable()
export class PlacepricingService {
  constructor(
    @InjectRepository(PlacePricing)
    private readonly repo: Repository<PlacePricing>,
  ) {}

  async create(dto: CreatePlacepricingDto) {
    const { place, ...rest } = dto;
    const data = this.repo.create({
      ...rest,
      place: { id: place } as Place,
    });
    return await this.repo.save(data);
  }

  async findAll() {
    return await this.repo.find({
      relations: ['place'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['place'],
    });

    if (!item) throw new NotFoundException('Pricing not found');

    return item;
  }

  async update(id: string, dto: UpdatePlacepricingDto) {
    const item = await this.findOne(id);
    const { place, ...rest } = dto;
    Object.assign(item, rest);

    if (place) {
      item.place = { id: place } as Place;
    }

    return await this.repo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    return await this.repo.softDelete(item.id);
  }
}
