import { DataSource } from 'typeorm';
import { City } from '../src/modules/cities/entities/city.entity';
import { Country } from '../src/modules/countries/entities/country.entity';
import { PlaceOpeningHour } from '../src/modules/place-opening-hours/entities/place-opening-hour.entity';
import { Place, PlaceType } from '../src/modules/place/entities/place.entity';
import { PlacePricing } from '../src/modules/placepricing/entities/placepricing.entity';
import {
  Provider,
  ProviderTypeEnum,
  VerificationStatusEnum,
} from '../src/modules/providers/entities/provider.entity';
import { Tag } from '../src/modules/tag/entities/tag.entity';

type SeedTotals = {
  city: number;
  tags: number;
  providers: number;
  places: number;
  pricings: number;
  openingHours: number;
};

export type SeedBethlehemResult = {
  created: SeedTotals;
  skipped: SeedTotals;
};

type SeedProvider = {
  displayName: string;
  providerType: ProviderTypeEnum;
  phone: string;
  verificationStatus?: VerificationStatusEnum;
  isActive?: boolean;
};

type SeedPricing = {
  basePrice: number;
  currencyCode: string;
  perPerson: boolean;
  maxPeople?: number;
};

type SeedOpeningHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
};

type SeedPlace = {
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  tags: string[];
  ratingAverage: number;
  isActive?: boolean;
  isVerified?: boolean;
  pricing: SeedPricing;
  openingHours: SeedOpeningHour[];
};

const BETHLEHEM_CITY = {
  name: 'Bethlehem',
  latitude: 31.7054,
  longitude: 35.2024,
  stateName: 'Bethlehem Governorate',
};

const TAGS = [
  'heritage',
  'religious',
  'family-friendly',
  'food',
  'coffee',
  'outdoors',
  'shopping',
  'culture',
  'art',
];

const PROVIDERS: SeedProvider[] = [
  {
    displayName: 'Heritage Tours',
    providerType: ProviderTypeEnum.TOUR_PROVIDER,
    phone: '+970-2-555-0101',
    verificationStatus: VerificationStatusEnum.VERIFIED,
    isActive: true,
  },
  {
    displayName: 'Nativity Hospitality Group',
    providerType: ProviderTypeEnum.RESTAURANT,
    phone: '+970-2-555-0102',
    verificationStatus: VerificationStatusEnum.VERIFIED,
    isActive: true,
  },
  {
    displayName: 'Bethlehem Hotel Management',
    providerType: ProviderTypeEnum.HOTEL,
    phone: '+970-2-555-0103',
    verificationStatus: VerificationStatusEnum.VERIFIED,
    isActive: true,
  },
  {
    displayName: 'Old City Activities',
    providerType: ProviderTypeEnum.ACTIVITY_PROVIDER,
    phone: '+970-2-555-0104',
    verificationStatus: VerificationStatusEnum.VERIFIED,
    isActive: true,
  },
];

const PROVIDER_BY_PLACE_TYPE: Record<PlaceType, string> = {
  [PlaceType.LANDMARK]: 'Heritage Tours',
  [PlaceType.TOUR]: 'Heritage Tours',
  [PlaceType.RESTAURANT]: 'Nativity Hospitality Group',
  [PlaceType.CAFE]: 'Nativity Hospitality Group',
  [PlaceType.HOTEL]: 'Bethlehem Hotel Management',
  [PlaceType.ACTIVITY]: 'Old City Activities',
  [PlaceType.PARK]: 'Old City Activities',
  [PlaceType.SHOP]: 'Old City Activities',
};

const PLACES: SeedPlace[] = [
  {
    name: 'Church of the Nativity',
    type: PlaceType.LANDMARK,
    latitude: 31.7056,
    longitude: 35.2023,
    tags: ['heritage', 'religious', 'culture'],
    ratingAverage: 4.8,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
    openingHours: buildWeeklyHours('07:00', '19:00'),
  },
  {
    name: 'Manger Square',
    type: PlaceType.LANDMARK,
    latitude: 31.7051,
    longitude: 35.2029,
    tags: ['heritage', 'culture', 'family-friendly'],
    ratingAverage: 4.5,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
    openingHours: buildWeeklyHours('06:00', '23:00'),
  },
  {
    name: 'Bethlehem Heritage Museum',
    type: PlaceType.TOUR,
    latitude: 31.706,
    longitude: 35.201,
    tags: ['heritage', 'culture', 'art'],
    ratingAverage: 4.6,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 40, currencyCode: 'ILS', perPerson: true },
    openingHours: buildWeeklyHours('09:00', '17:00'),
  },
  {
    name: 'Star Street Cafe',
    type: PlaceType.CAFE,
    latitude: 31.707,
    longitude: 35.2035,
    tags: ['coffee', 'food', 'culture'],
    ratingAverage: 4.4,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 25, currencyCode: 'ILS', perPerson: true },
    openingHours: buildWeeklyHours('08:00', '22:00'),
  },
  {
    name: 'Nativity Garden Restaurant',
    type: PlaceType.RESTAURANT,
    latitude: 31.704,
    longitude: 35.2015,
    tags: ['food', 'family-friendly', 'culture'],
    ratingAverage: 4.3,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 60, currencyCode: 'ILS', perPerson: true },
    openingHours: buildWeeklyHours('11:00', '23:00'),
  },
  {
    name: 'Bethlehem Star Hotel',
    type: PlaceType.HOTEL,
    latitude: 31.7065,
    longitude: 35.206,
    tags: ['family-friendly', 'culture'],
    ratingAverage: 4.2,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 350, currencyCode: 'ILS', perPerson: false },
    openingHours: buildWeeklyHours('00:00', '23:59'),
  },
  {
    name: "Shepherds' Field Trail",
    type: PlaceType.ACTIVITY,
    latitude: 31.729,
    longitude: 35.225,
    tags: ['outdoors', 'heritage'],
    ratingAverage: 4.5,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 15, currencyCode: 'ILS', perPerson: true },
    openingHours: buildWeeklyHours('07:00', '18:00'),
  },
  {
    name: "Solomon's Pools Park",
    type: PlaceType.PARK,
    latitude: 31.6666,
    longitude: 35.2286,
    tags: ['outdoors', 'family-friendly', 'heritage'],
    ratingAverage: 4.4,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 20, currencyCode: 'ILS', perPerson: false },
    openingHours: buildWeeklyHours('08:00', '17:00'),
  },
  {
    name: 'Old City Souk',
    type: PlaceType.SHOP,
    latitude: 31.7048,
    longitude: 35.2042,
    tags: ['shopping', 'culture'],
    ratingAverage: 4.1,
    isActive: true,
    isVerified: true,
    pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
    openingHours: buildWeeklyHours('09:00', '19:00'),
  },
];

export async function seedBethlehem(
  dataSource: DataSource,
): Promise<SeedBethlehemResult> {
  const result: SeedBethlehemResult = {
    created: {
      city: 0,
      tags: 0,
      providers: 0,
      places: 0,
      pricings: 0,
      openingHours: 0,
    },
    skipped: {
      city: 0,
      tags: 0,
      providers: 0,
      places: 0,
      pricings: 0,
      openingHours: 0,
    },
  };

  const logCreated = (key: keyof SeedTotals, label: string) => {
    result.created[key] += 1;
    console.log(`[seed] created ${key}: ${label}`);
  };

  const logSkipped = (key: keyof SeedTotals, label: string) => {
    result.skipped[key] += 1;
    console.log(`[seed] skipped ${key}: ${label}`);
  };

  try {
    const cityRepo = dataSource.getRepository(City);
    const countryRepo = dataSource.getRepository(Country);
    const tagRepo = dataSource.getRepository(Tag);
    const providerRepo = dataSource.getRepository(Provider);
    const placeRepo = dataSource.getRepository(Place);
    const pricingRepo = dataSource.getRepository(PlacePricing);
    const openingHourRepo = dataSource.getRepository(PlaceOpeningHour);

    const country = await countryRepo.findOne({
      where: [
        { alpha2Code: 'PS' },
        { name: 'Palestine' },
        { name: 'State of Palestine' },
      ],
    });

    if (!country) {
      throw new Error(
        'Seed Bethlehem failed: Country with alpha2Code "PS" (or name match) not found.',
      );
    }

    let city = await cityRepo.findOne({
      where: { name: BETHLEHEM_CITY.name },
    });

    if (!city) {
      city = cityRepo.create({
        name: BETHLEHEM_CITY.name,
        latitude: BETHLEHEM_CITY.latitude,
        longitude: BETHLEHEM_CITY.longitude,
        stateName: BETHLEHEM_CITY.stateName,
        country,
      });
      city = await cityRepo.save(city);
      logCreated('city', city.name);
    } else {
      logSkipped('city', city.name);
    }

    const tagByName = new Map<string, Tag>();
    for (const tagName of TAGS) {
      let tag = await tagRepo.findOne({ where: { name: tagName } });
      if (!tag) {
        tag = tagRepo.create({ name: tagName });
        tag = await tagRepo.save(tag);
        logCreated('tags', tag.name);
      } else {
        logSkipped('tags', tag.name);
      }
      tagByName.set(tagName, tag);
    }

    const providerByName = new Map<string, Provider>();
    for (const providerSeed of PROVIDERS) {
      const slug = slugify(providerSeed.displayName);
      let provider = await providerRepo.findOne({ where: { slug } });
      if (!provider) {
        provider = providerRepo.create({
          ...providerSeed,
          slug,
          city,
        });
        provider = await providerRepo.save(provider);
        logCreated('providers', provider.displayName);
      } else {
        logSkipped('providers', provider.displayName);
      }
      providerByName.set(providerSeed.displayName, provider);
    }

    for (const placeSeed of PLACES) {
      const slug = slugify(placeSeed.name);
      let place = await placeRepo.findOne({ where: { slug } });

      if (!place) {
        const providerName = PROVIDER_BY_PLACE_TYPE[placeSeed.type];
        const provider = providerByName.get(providerName);
        if (!provider) {
          throw new Error(
            `Seed Bethlehem failed: Provider "${providerName}" not found for place "${placeSeed.name}".`,
          );
        }

        const tags = placeSeed.tags.map((tagName) => {
          const tag = tagByName.get(tagName);
          if (!tag) {
            throw new Error(
              `Seed Bethlehem failed: Tag "${tagName}" not found for place "${placeSeed.name}".`,
            );
          }
          return tag;
        });

        place = placeRepo.create({
          name: placeSeed.name,
          slug,
          description: buildDescription(placeSeed),
          type: placeSeed.type,
          latitude: placeSeed.latitude,
          longitude: placeSeed.longitude,
          ratingAverage: placeSeed.ratingAverage,
          ratingCount: 1,
          isActive: placeSeed.isActive ?? true,
          isVerified: placeSeed.isVerified ?? false,
          provider,
          city,
          tags,
        });
        place = await placeRepo.save(place);
        logCreated('places', place.name);
      } else {
        logSkipped('places', place.name);
      }

      const pricingSeed = placeSeed.pricing;
      const existingPricing = await pricingRepo.findOne({
        where: {
          place: { id: place.id },
          basePrice: pricingSeed.basePrice,
          currencyCode: pricingSeed.currencyCode,
          perPerson: pricingSeed.perPerson,
        },
      });

      if (!existingPricing) {
        const pricing = pricingRepo.create({
          place,
          basePrice: pricingSeed.basePrice,
          currencyCode: pricingSeed.currencyCode,
          perPerson: pricingSeed.perPerson,
          maxPeople: pricingSeed.maxPeople,
        });
        await pricingRepo.save(pricing);
        logCreated(
          'pricings',
          `${place.name} (${pricingSeed.basePrice} ${pricingSeed.currencyCode})`,
        );
      } else {
        logSkipped(
          'pricings',
          `${place.name} (${pricingSeed.basePrice} ${pricingSeed.currencyCode})`,
        );
      }

      for (const hour of placeSeed.openingHours) {
        const existingHour = await openingHourRepo.findOne({
          where: {
            place: { id: place.id },
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
          },
        });

        if (!existingHour) {
          const openingHour = openingHourRepo.create({
            place,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
          });
          await openingHourRepo.save(openingHour);
          logCreated('openingHours', `${place.name} day ${hour.dayOfWeek}`);
        } else {
          logSkipped('openingHours', `${place.name} day ${hour.dayOfWeek}`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('[seed] Bethlehem seed failed.', error);
    throw error;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildWeeklyHours(
  openTime: string,
  closeTime: string,
): SeedOpeningHour[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime,
    closeTime,
  }));
}

function buildDescription(place: SeedPlace): string {
  const typeLabel = place.type.toLowerCase().replace('_', ' ');
  return `Experience ${place.name}, a ${typeLabel} in Bethlehem offering local character and easy access to the old city.`;
}
