import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { Repository } from 'typeorm';
import { CurrenciesService } from '../currencies/currencies.service';
import axios from 'axios';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,

    private readonly currencyService: CurrenciesService,
  ) {}

  async getFromApi() {
    const response = await axios.get('https://www.apicountries.com/countries');
    const countriesData = response.data;

    for (const c of countriesData) {
      try {
        let country = await this.countryRepo.findOne({
          where: { alpha3Code: c.alpha3Code },
        });

        if (!country) {
          country = this.countryRepo.create({
            name: c.name,
            nativeName: c.nativeName,
            alpha2Code: c.alpha2Code,
            alpha3Code: c.alpha3Code,
            numericCode: c.numericCode,
            region: c.region,
            subregion: c.subregion,
            capital: c.capital,
            population: c.population,
            area: c.area,
            latitude: c.latlng?.[0],
            longitude: c.latlng?.[1],
            flagUrl: c.flags?.svg || c.flag,
            independent: c.independent,
            callingCodes: c.callingCodes,
          });

          const savedCountry = await this.countryRepo.save(country);

          if (Array.isArray(c.currencies)) {
            for (const curr of c.currencies) {
              try {
                await this.currencyService.UpdateByCode(
                  curr.code,
                  curr.name,
                  savedCountry,
                );
              } catch (err) {
                console.warn(
                  `Failed to save currency ${curr.code} for ${c.name}:`,
                  err.message,
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to save country ${c.name}:`, err.message);
      }
    }
  }

  async create(createCountryDto: CreateCountryDto) {
    const country = this.countryRepo.create(createCountryDto);
    return await this.countryRepo.save(country);
  }

  async findAll(page: number = 1, limit: number = 10) {
    limit = limit > 50 ? 50 : limit;

    const [countries, total] = await this.countryRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });

    return {
      data: countries,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const country = await this.countryRepo.findOne({
      where: { id },
      relations: ['cities'],
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async findByAlpha2Code(code: string) {
    const country = await this.countryRepo.findOne({
      where: { alpha2Code: code },
      relations: ['cities'],
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    const country = await this.findOne(id);

    Object.assign(country, updateCountryDto);

    return await this.countryRepo.save(country);
  }

  async remove(id: string) {
    const country = await this.findOne(id);

    await this.countryRepo.softDelete(country.id);

    return {
      message: 'Country deleted successfully',
    };
  }
}
