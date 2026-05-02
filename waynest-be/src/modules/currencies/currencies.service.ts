import {
  Injectable,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import currenciesJson from '../../../seed/currency-format.json';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { Repository } from 'typeorm';
import { Country } from '../countries/entities/country.entity';
import { HotPathCache } from '../../common/utils/hot-path-cache';
import { REDIS_CLIENT_TOKEN } from '../../common/redis/redis.module';

type CurrencySymbol = {
  grapheme: string;
  rtl: boolean;
  template: string;
};

type CurrencySeedRecord = {
  fractionSize?: number | null;
  name: string;
  symbol?: CurrencySymbol | null;
  uniqSymbol?: CurrencySymbol | null;
};

@Injectable()
export class CurrenciesService {
  private readonly readCache: HotPathCache;

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,

    @Optional()
    @Inject(REDIS_CLIENT_TOKEN)
    redisClient?: any,
  ) {
    this.readCache = new HotPathCache(200, redisClient || undefined);
  }

  async getFromApi() {
    const currencySeeds = currenciesJson as Record<string, CurrencySeedRecord>;

    for (const code of Object.keys(currencySeeds)) {
      const currencySeed = currencySeeds[code];

      let currency = await this.currencyRepo.findOne({ where: { code } });

      if (!currency) {
        currency = this.currencyRepo.create({
          code,
          name: currencySeed.name,
          fractionSize: currencySeed.fractionSize ?? undefined,
          symbol: currencySeed.symbol ?? undefined,
          uniqSymbol: currencySeed.uniqSymbol?.grapheme ?? undefined,
        });

        await this.currencyRepo.save(currency);
      }
    }

    return { message: 'Currencies imported successfully' };
  }

  async create(createCurrencyDto: CreateCurrencyDto) {
    const currency = this.currencyRepo.create(createCurrencyDto);
    this.readCache.deleteByPrefix('currencies:list');
    return await this.currencyRepo.save(currency);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit || 10), 1000));

    const cacheKey = ['currencies:list', String(page), String(safeLimit)].join(
      ':',
    );
    const ttlMs = 30_000; // 30 seconds

    return this.readCache.getOrSet(cacheKey, ttlMs, async () => {
      const [currencies, total] = await this.currencyRepo.findAndCount({
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        order: { name: 'ASC' },
      });

      return {
        data: currencies,
        total,
        page,
        lastPage: Math.ceil(total / safeLimit),
      };
    });
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

    this.readCache.deleteByPrefix('currencies:list');
    return await this.currencyRepo.save(currency);
  }

  async remove(id: string) {
    const currency = await this.findOne(id);

    await this.currencyRepo.softDelete(currency.id);

    this.readCache.deleteByPrefix('currencies:list');
    return {
      message: 'Currency deleted successfully',
    };
  }
}
