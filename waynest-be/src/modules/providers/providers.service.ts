import { Injectable } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import slugify from 'slugify';
import { InjectRepository } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CitiesService } from '../cities/cities.service';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
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
      users: [user],
      city,
    });
    return this.providerRepo.save(provider);
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
