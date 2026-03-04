import { Injectable } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import axios from 'axios';
import countries from 'world-countries';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { Repository } from 'typeorm';
import { Currency } from '../currencies/entities/currency.entity';
import { CurrenciesService } from '../currencies/currencies.service';

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

  create(createCountryDto: CreateCountryDto) {
    return 'This action adds a new country';
  }

  findAll() {
    return `This action returns all countries`;
  }

  findOne(id: string) {
    return this.countryRepo.findOne({ where: { id } });
  }

  findByAlpha2Code(code: string) {
    return this.countryRepo.findOne({ where: { alpha2Code: code } ,relations:['cities']});
  }

  update(id: number, updateCountryDto: UpdateCountryDto) {
    return `This action updates a #${id} country`;
  }

  remove(id: number) {
    return `This action removes a #${id} country`;
  }
}
