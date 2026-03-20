import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { Repository } from 'typeorm';
import { CurrenciesService } from '../currencies/currencies.service';
import axios from 'axios';

type ApiCountryCurrency = {
  code?: string;
  name?: string;
};

type ApiCountry = {
  alpha2Code?: string;
  alpha3Code?: string;
  area?: number;
  callingCodes?: string[];
  capital?: string;
  currencies?: ApiCountryCurrency[];
  flag?: string;
  flags?: {
    svg?: string;
  };
  independent?: boolean;
  latlng?: number[];
  name?: string;
  nativeName?: string;
  numericCode?: string;
  population?: number;
  region?: string;
  subregion?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,

    private readonly currencyService: CurrenciesService,
  ) {}

  async getFromApi() {
    const response = await axios.get<ApiCountry[]>(
      'https://www.apicountries.com/countries',
    );
    const countriesData = Array.isArray(response.data) ? response.data : [];

    for (const c of countriesData) {
      if (!c.alpha2Code || !c.alpha3Code || !c.name) {
        continue;
      }

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
            flagUrl: c.flags?.svg ?? c.flag,
            independent: c.independent ?? true,
            callingCodes: Array.isArray(c.callingCodes) ? c.callingCodes : [],
          });

          const savedCountry = await this.countryRepo.save(country);

          if (Array.isArray(c.currencies)) {
            for (const curr of c.currencies) {
              if (!curr.code) {
                continue;
              }

              try {
                await this.currencyService.updateByCode(
                  curr.code,
                  curr.name ?? curr.code,
                  savedCountry,
                );
              } catch (err) {
                console.warn(
                  `Failed to save currency ${curr.code} for ${c.name}:`,
                  getErrorMessage(err),
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to save country ${c.name}:`, getErrorMessage(err));
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
