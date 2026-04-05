import { Injectable, NotFoundException } from '@nestjs/common';
import { isUuid } from 'src/common/utils/id.util';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { ILike, Repository } from 'typeorm';
import { Provider } from '../providers/entities/provider.entity';
import { City } from '../cities/entities/city.entity';
import { Tag } from '../tag/entities/tag.entity';

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
  ) {}

  async create(createPlaceDto: CreatePlaceDto) {
    const { provider, city, tags, ...rest } = createPlaceDto;
    const place = this.placeRepo.create({
      ...rest,
      provider: { id: provider } as Provider,
      city: { id: city } as City,
      tags: tags?.map((id) => ({ id })) as Tag[] | undefined,
    });
    return await this.placeRepo.save(place);
  }

  async findAll(page: number = 1, limit: number = 10, country?: string, city?: string) {
    limit = limit > 50 ? 50 : limit;

    const qb = this.placeRepo
      .createQueryBuilder('place')
      .leftJoinAndSelect('place.city', 'city')
      .leftJoinAndSelect('city.country', 'country')
      .leftJoinAndSelect('place.provider', 'provider')
      .leftJoinAndSelect('place.tags', 'tags')
      .where('place.isActive = true')
      .orderBy('place.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (country) {
      qb.andWhere('country.name ILIKE :country', { country: `%${country}%` });
    }
    if (city) {
      qb.andWhere('city.name ILIKE :city', { city: `%${city}%` });
    }

    const [places, total] = await qb.getManyAndCount();

    return {
      data: places,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Active places nearest to a point (Haversine). Sorted in-process so we avoid TypeORM/raw-SQL
   * orderBy quirks with aliases. Capped fetch keeps this safe for typical catalog sizes.
   */
  async findNearest(lat: number, lng: number, limit: number = 5) {
    const safeLimit = Math.min(Math.max(limit, 1), 25);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    const maxScan = 2500;
    const rows = await this.placeRepo.find({
      where: { isActive: true },
      relations: ['city'],
      take: maxScan,
      order: { createdAt: 'DESC' },
    });

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;

    const withDistance = rows.map((pl) => {
      const plat = Number(pl.latitude);
      const plng = Number(pl.longitude);
      const inner = Math.min(
        1,
        Math.max(
          -1,
          Math.cos(toRad(lat)) * Math.cos(toRad(plat)) * Math.cos(toRad(plng) - toRad(lng)) +
            Math.sin(toRad(lat)) * Math.sin(toRad(plat)),
        ),
      );
      const meters = R * Math.acos(inner);
      return { pl, meters: Number.isFinite(meters) ? meters : Number.POSITIVE_INFINITY };
    });

    withDistance.sort((a, b) => a.meters - b.meters);
    return withDistance.slice(0, safeLimit).map((x) => x.pl);
  }

  async findOne(idOrSlug: string) {
    const place = await this.placeRepo.findOne({
      where: isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      relations: ['city', 'provider', 'tags'],
    });

    if (!place) {
      throw new NotFoundException(`Place not found`);
    }

    return place;
  }

  async update(id: string, updatePlaceDto: UpdatePlaceDto) {
    const place = await this.placeRepo.findOne({
      where: { id },
      relations: ['city', 'provider', 'tags'],
    });
    if (!place) {
      throw new NotFoundException(`Place not found`);
    }

    const { provider, city, tags, ...rest } = updatePlaceDto;
    Object.assign(place, rest);

    if (provider) {
      place.provider = { id: provider } as Provider;
    }

    if (city) {
      place.city = { id: city } as City;
    }

    if (tags !== undefined) {
      place.tags = tags.map((id) => ({ id })) as Tag[];
    }

    return await this.placeRepo.save(place);
  }

  async remove(id: string) {
    const place = await this.placeRepo.findOne({ where: { id } });
    if (!place) {
      throw new NotFoundException(`Place not found`);
    }

    await this.placeRepo.softDelete(place.id);

    return {
      message: 'Place deleted successfully',
    };
  }
}
