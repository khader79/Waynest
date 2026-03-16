import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';
import { CountriesService } from '../countries/countries.service';
import cities from '../seed/countries_states_cities.json';
import { Country } from '../countries/entities/country.entity';

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
  constructor(
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    private readonly countryService: CountriesService,
  ) {}
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
    return await this.cityRepo.save(city);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const offset = Math.max((page - 1) * limit, 0);
    const [data, total] = await this.cityRepo.findAndCount({
      skip: offset,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });
    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return await this.cityRepo.findOne({
      where: { id },
    });
  }

  async findByName(name: string) {
    return await this.cityRepo.findOne({
      where: { name },
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

    return await this.cityRepo.save(city);
  }

  async remove(id: string) {
    const city = await this.cityRepo.findOne({
      where: { id },
    });

    if (!city) {
      return null;
    }

    return await this.cityRepo.softDelete(city.id);
  }
}
