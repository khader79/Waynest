import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import currenciesJson from '../seed/currency-format.json';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { Repository } from 'typeorm';
import { CountriesService } from '../countries/countries.service';
import { Country } from '../countries/entities/country.entity';
@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
  ) {}

  async getFromApi() {
    for (const code in currenciesJson) {
      const c1 = currenciesJson[code];

      const currency = this.currencyRepo.create({
        code: code,
        name: c1.name,
        fractionSize: c1.fractionSize,
        symbol: c1.symbol,
        uniqSymbol: c1.uniqSymbol,
      });

      await this.currencyRepo.save(currency);
    }
  }
  create(createCurrencyDto: CreateCurrencyDto) {
    return 'This action adds a new currency';
  }

  findAll() {
    return `This action returns all currencies`;
  }

  async UpdateByCode(code: string, name: string, country: Country) {
    if (!code) return;

    let currency = await this.currencyRepo.findOne({
      where: { code },
      relations: ['countries'],
    });

    if (!currency) {
      currency = this.currencyRepo.create({
        code,
        name: name || code,
        countries: [],
      });
    }

    currency.countries.push(country);

    return await this.currencyRepo.save(currency);
  }
  
  async findOne(id: string) {
    const currency = await this.currencyRepo.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    return currency;
  }

  update(id: number, updateCurrencyDto: UpdateCurrencyDto) {
    return `This action updates a #${id} currency`;
  }

  remove(id: number) {
    return `This action removes a #${id} currency`;
  }
}
