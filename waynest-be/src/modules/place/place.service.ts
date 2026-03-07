import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  async create(createPlaceDto: CreatePlaceDto) {
    const place = this.placeRepo.create(createPlaceDto);
    return await this.placeRepo.save(place);
  }

  async findAll(page: number = 1, limit: number = 10) {
    limit = limit > 50 ? 50 : limit;

    const [places, total] = await this.placeRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['city', 'tags'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: places,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const place = await this.placeRepo.findOne({
      where: { id },
      relations: ['city', 'country', 'tags'],
    });

    if (!place) {
      throw new NotFoundException(`Place with id ${id} not found`);
    }

    return place;
  }

  async update(id: string, updatePlaceDto: UpdatePlaceDto) {
    const place = await this.findOne(id);

    Object.assign(place, updatePlaceDto);

    return await this.placeRepo.save(place);
  }

  async remove(id: string) {
    const place = await this.findOne(id);

    await this.placeRepo.softDelete(place.id);

    return {
      message: 'Place deleted successfully',
    };
  }
}
