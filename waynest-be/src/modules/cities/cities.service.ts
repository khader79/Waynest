import { Injectable } from '@nestjs/common';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';
import { CountriesService } from '../countries/countries.service';
import cities from '../seed/countries_states_cities.json';
@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    private readonly countryService: CountriesService,
  ) {}
  async getCities() {
    //@ts-ignore
    for (const countryData of cities) {
      const country = await this.countryService.findByAlpha2Code(
        countryData.iso2,
      );
      if (!country) continue;

      if (countryData.states) {
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

          for (const cityData of state.cities) {
            const exists = await this.cityRepo.findOne({
              where: { name: cityData.name, country: { id: country.id } },
            });

            if (!exists) {
              const city = this.cityRepo.create({
                name: cityData.name,
                latitude: Number(state.latitude),
                longitude: Number(state.longitude),
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
  create(createCityDto: CreateCityDto) {
    return 'This action adds a new city';
  }

  findAll() {
    return `This action returns all cities`;
  }

  findOne(id: number) {
    return `This action returns a #${id} city`;
  }

  findByName(name: string) {
    return this.cityRepo.findOne({ where: { name } });
  }
  update(id: number, updateCityDto: UpdateCityDto) {
    return `This action updates a #${id} city`;
  }

  remove(id: number) {
    return `This action removes a #${id} city`;
  }
}
