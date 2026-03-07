import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlacepricingDto } from './dto/create-placepricing.dto';
import { UpdatePlacepricingDto } from './dto/update-placepricing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacePricing } from './entities/placepricing.entity';


@Injectable()
export class PlacepricingService {
  constructor(
    @InjectRepository(PlacePricing)
    private readonly repo: Repository<PlacePricing>,
  ) {}

  async create(dto: CreatePlacepricingDto) {
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

    if (!item) throw new NotFoundException('Pricing not found');

    return item;
  }

  async update(id: string, dto: UpdatePlacepricingDto) {
    await this.repo.update(id, dto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    return await this.repo.softDelete(item.id);
  }
}
