import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceOpeningHour } from './entities/place-opening-hour.entity';
import { CreatePlaceOpeningHourDto } from './dto/create-place-opening-hour.dto';
import { UpdatePlaceOpeningHourDto } from './dto/update-place-opening-hour.dto';

@Injectable()
export class PlaceOpeningHoursService {
  constructor(
    @InjectRepository(PlaceOpeningHour)
    private readonly repo: Repository<PlaceOpeningHour>,
  ) {}

  async create(dto: CreatePlaceOpeningHourDto) {
    const data = this.repo.create(dto);
    return await this.repo.save(data);
  }

  async findAll() {
    return await this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({
      where: { id },
    });

    if (!item) throw new NotFoundException('Opening hour not found');

    return item;
  }

  async update(id: string, dto: UpdatePlaceOpeningHourDto) {
    await this.repo.update(id, dto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    return await this.repo.softDelete(item.id);
  }
}
