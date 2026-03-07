import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CitiesService } from '../cities/cities.service';
import { ProviderMembershipService } from '../provider-membership/provider-membership.service';
import { User } from '../users/entities/user.entity';
import slugify from 'slugify';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
    private readonly citiesService: CitiesService,
    private readonly membershipService: ProviderMembershipService,
  ) {}

  async create(dto: CreateProviderDto, user: User) {
    let slug = slugify(dto.displayName, {
      lower: true,
      strict: true,
    });

    const existing = await this.repo.findOne({ where: { slug } });

    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const city = await this.citiesService.findByName(dto.city);

    if (!city) {
      throw new NotFoundException(`City "${dto.city}" not found`);
    }

    const provider = this.repo.create({
      ...dto,
      slug,
      city,
    });

    const savedProvider = await this.repo.save(provider);

    await this.membershipService.createOwnerMembership(user, savedProvider);

    return savedProvider;
  }

  async findAll() {
    return await this.repo.find({
      relations: ['city'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const provider = await this.repo.findOne({
      where: { id },
      relations: ['city'],
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async update(id: string, dto: UpdateProviderDto) {
    const provider = await this.findOne(id);

    if (dto.city) {
      const city = await this.citiesService.findByName(dto.city);

      if (!city) {
        throw new Error(`City "${dto.city}" not found`);
      }

      provider.city = city;
    }

    Object.assign(provider, dto);

    await this.repo.save(provider);

    return provider;
  }

  async remove(id: string) {
    const provider = await this.findOne(id);
    return await this.repo.softDelete(provider.id);
  }
}
