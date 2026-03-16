import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import currenciesJson from '../seed/currency-format.json';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { Repository } from 'typeorm';
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

      let currency = await this.currencyRepo.findOne({ where: { code } });

      if (!currency) {
        currency = this.currencyRepo.create({
          code,
          name: c1.name,
          fractionSize: c1.fractionSize,
          symbol: c1.symbol,
          uniqSymbol: c1.uniqSymbol,
        });

        await this.currencyRepo.save(currency);
      }
    }

    return { message: 'Currencies imported successfully' };
  }

  async create(createCurrencyDto: CreateCurrencyDto) {
    const currency = this.currencyRepo.create(createCurrencyDto);
    return await this.currencyRepo.save(currency);
  }

  async findAll(page: number = 1, limit: number = 10) {
    limit = limit > 50 ? 50 : limit;

    const [currencies, total] = await this.currencyRepo.findAndCount({
      relations: ['countries'],
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });

    return {
      data: currencies,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const currency = await this.currencyRepo.findOne({
      where: { id },
      relations: ['countries'],
    });

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    return currency;
  }

  async updateByCode(code: string, name: string, country: Country) {
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

    const exists = currency.countries?.find((c) => c.id === country.id);

    if (!exists) {
      currency.countries.push(country);
    }

    return await this.currencyRepo.save(currency);
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.findOne(id);

    Object.assign(currency, updateCurrencyDto);

    return await this.currencyRepo.save(currency);
  }

  async remove(id: string) {
    const currency = await this.findOne(id);

    await this.currencyRepo.softDelete(currency.id);

    return {
      message: 'Currency deleted successfully',
    };
  }
}
