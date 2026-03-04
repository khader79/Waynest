import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';

import { CreateProviderDto } from './dto/create-provider.dto';
import { CitiesService } from '../cities/cities.service';
import { User } from '../users/entities/user.entity';
import slugify from 'slugify';
import {
  ProviderMembership,
  ProviderRole,
} from '../provider-membership/entities/provider-membership.entity';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(ProviderMembership)
    private readonly providerMembershipRepo: Repository<ProviderMembership>,

    private readonly citiesService: CitiesService,
  ) {}

  async create(createProviderDto: CreateProviderDto, user: User) {
    let slug = slugify(createProviderDto.displayName, {
      lower: true,
      strict: true,
    });

    const existing = await this.providerRepo.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const city = await this.citiesService.findByName(createProviderDto.city);
    if (!city) {
      throw new Error(`City "${createProviderDto.city}" not found`);
    }

    const provider = this.providerRepo.create({
      ...createProviderDto,
      slug,
      city,
    });

    const savedProvider = await this.providerRepo.save(provider);

    const existingMembership = await this.providerMembershipRepo.findOne({
      where: { user: { id: user.id }, provider: { id: savedProvider.id } },
    });

    if (!existingMembership) {
      const membership = this.providerMembershipRepo.create({
        user: user,
        provider: savedProvider,
        providerRole: ProviderRole.OWNER,
      });
      await this.providerMembershipRepo.save(membership);
    }

    return savedProvider;
  }

  findAll() {
    return `This action returns all providers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} provider`;
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    return `This action updates a #${id} provider`;
  }

  remove(id: number) {
    return `This action removes a #${id} provider`;
  }
}
