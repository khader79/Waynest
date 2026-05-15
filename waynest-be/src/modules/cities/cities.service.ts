import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { ILike, Repository } from 'typeorm';
import { CountriesService } from '../countries/countries.service';
import cities from '../../../seed/countries_states_cities.json';
import { Country } from '../countries/entities/country.entity';
import { HotPathCache } from 'src/common/utils/hot-path-cache';

type CitySeed = {
  name: string;
  latitude: string | number;
  longitude: string | number;
};

type StateSeed = {
  name: string;
  latitude?: string | number;
  longitude?: string | number;
  cities?: CitySeed[];
};

type CountrySeed = {
  iso2: string;
  states?: StateSeed[];
};
@Injectable()
export class CitiesService {
  private readonly readCache = new HotPathCache(200);

  constructor(
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    private readonly countryService: CountriesService,
  ) {}

  private clearReadCache() {
    this.readCache.clear();
  }

  async getCities() {
    const countrySeeds = cities as CountrySeed[];

    for (const countryData of countrySeeds) {
      const country = await this.countryService.findByAlpha2Code(
        countryData.iso2,
      );
      if (!country) continue;

      if (countryData.states?.length) {
        for (const state of countryData.states) {
          const stateExists = await this.cityRepo.findOne({
            where: { name: state.name, country: { id: country.id } },
          });

          if (!stateExists) {
            const state1 = this.cityRepo.create({
              name: state.name,
              latitude: Number(state.latitude),
              longitude: Number(state.longitude),
              stateName: state.name,
              country: country,
            });
            await this.cityRepo.save(state1);
          }

          for (const cityData of state.cities ?? []) {
            const exists = await this.cityRepo.findOne({
              where: { name: cityData.name, country: { id: country.id } },
            });

            if (!exists) {
              const city = this.cityRepo.create({
                name: cityData.name,
                latitude: Number(cityData.latitude),
                longitude: Number(cityData.longitude),
                stateName: state.name,
                country: country,
              });
              await this.cityRepo.save(city);
            }
          }
        }
      }
    }
  }
  async create(createCityDto: CreateCityDto) {
    const { country, ...rest } = createCityDto;
    const city = this.cityRepo.create({
      ...rest,
      country: { id: country } as Country,
    });
    const saved = await this.cityRepo.save(city);
    this.clearReadCache();
    return saved;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const safePage = Math.max(1, Number(page) || 1);
    let safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit < 1) {
      safeLimit = 100;
    }
    safeLimit = Math.min(safeLimit, 2000);

    const offset = Math.max((safePage - 1) * safeLimit, 0);
    const term = search?.trim() || '';
    const cacheKey = [
      'cities:list',
      safePage,
      safeLimit,
      term.toLowerCase(),
    ].join(':');

    return this.readCache.getOrSet(cacheKey, 20_000, async () => {
      const selectFields = [
        'city.id',
        'city.createdAt',
        'city.updatedAt',
        'city.name',
        'city.latitude',
        'city.longitude',
        'city.population',
        'city.stateName',
        'country.id',
        'country.name',
      ];

      const dataQb = this.cityRepo
        .createQueryBuilder('city')
        .leftJoin('city.country', 'country')
        .select(selectFields)
        .orderBy('city.name', 'ASC')
        .addOrderBy('city.id', 'ASC')
        .skip(offset)
        .take(safeLimit);

      if (term) {
        dataQb.andWhere('(city.name ILIKE :q OR country.name ILIKE :q)', {
          q: `%${term}%`,
        });
      }

      const countQb = this.cityRepo.createQueryBuilder('city');
      if (term) {
        countQb
          .leftJoin('city.country', 'country')
          .andWhere('(city.name ILIKE :q OR country.name ILIKE :q)', {
            q: `%${term}%`,
          });
      }

      const [data, total] = term
        ? await Promise.all([dataQb.getMany(), countQb.getCount()])
        : await Promise.all([dataQb.getMany(), countQb.getCount()]);

      return {
        data,
        total,
        page: safePage,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      };
    });
  }

  async findOne(id: string) {
    return await this.cityRepo.findOne({
      where: { id },
      relations: { country: true },
    });
  }

  async getAllCities(search?: string) {
    const term = search?.trim();
    const cacheKey = ['cities:all', (term ?? '').toLowerCase()].join(':');

    return this.readCache.getOrSet(cacheKey, 30_000, async () => {
      const qb = this.cityRepo
        .createQueryBuilder('city')
        .leftJoin('city.country', 'country')
        .select([
          'city.id',
          'city.name',
          'city.stateName',
          'city.latitude',
          'city.longitude',
          'city.population',
          'country.id',
          'country.name',
        ])
        .orderBy('country.name', 'ASC')
        .addOrderBy('city.name', 'ASC');

      if (term) {
        qb.andWhere('(city.name ILIKE :q OR country.name ILIKE :q)', {
          q: `%${term}%`,
        });
      }

      return qb.getMany();
    });
  }

  async findByName(name: string) {
    return await this.cityRepo.findOne({
      where: { name },
    });
  }

  async findByCountry(countryId: string) {
    const cacheKey = ['cities:by-country', countryId].join(':');

    return this.readCache.getOrSet(cacheKey, 30_000, async () => {
      return this.cityRepo.find({
        where: { country: { id: countryId } },
        order: { name: 'ASC' },
      });
    });
  }

  async update(id: string, updateCityDto: UpdateCityDto) {
    const city = await this.findOne(id);
    if (!city) throw new NotFoundException('City not found');

    const { country, ...rest } = updateCityDto;
    Object.assign(city, rest);

    if (country) {
      city.country = { id: country } as Country;
    }

    const saved = await this.cityRepo.save(city);
    this.clearReadCache();
    return saved;
  }

  async remove(id: string) {
    const city = await this.cityRepo.findOne({
      where: { id },
    });

    if (!city) {
      return null;
    }

    const result = await this.cityRepo.softDelete(city.id);
    this.clearReadCache();
    return result;
  }
}
