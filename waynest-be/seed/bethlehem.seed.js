"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedBethlehem = seedBethlehem;
const city_entity_1 = require("../src/modules/cities/entities/city.entity");
const country_entity_1 = require("../src/modules/countries/entities/country.entity");
const place_opening_hour_entity_1 = require("../src/modules/place-opening-hours/entities/place-opening-hour.entity");
const place_entity_1 = require("../src/modules/place/entities/place.entity");
const placepricing_entity_1 = require("../src/modules/placepricing/entities/placepricing.entity");
const provider_entity_1 = require("../src/modules/providers/entities/provider.entity");
const tag_entity_1 = require("../src/modules/tag/entities/tag.entity");
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
    'historic',
    'panoramic',
    'nightlife',
    'local-cuisine',
    'monastery',
    'museum',
    'olive-wood',
    'wine',
    'unesco',
    'nature',
    'hiking',
    'archaeology',
    'fine-dining',
    'boutique',
];
const PROVIDERS = [
    {
        displayName: 'Bethlehem Heritage Authority',
        phone: '+970-2-555-0101',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Bethlehem Hospitality Group',
        phone: '+970-2-555-0102',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Fine Bethlehem Dining',
        phone: '+970-2-555-0103',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Bethlehem Hotel Alliance',
        phone: '+970-2-555-0104',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Bethlehem Art & Souvenirs',
        phone: '+970-2-555-0105',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Bethlehem Outdoor Adventures',
        phone: '+970-2-555-0106',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
    {
        displayName: 'Bethlehem Cafe Culture',
        phone: '+970-2-555-0107',
        verificationStatus: provider_entity_1.VerificationStatusEnum.VERIFIED,
        isActive: true,
    },
];
const PROVIDER_BY_PLACE_TYPE = {
    [place_entity_1.PlaceType.LANDMARK]: 'Bethlehem Heritage Authority',
    [place_entity_1.PlaceType.TOUR]: 'Bethlehem Heritage Authority',
    [place_entity_1.PlaceType.RESTAURANT]: 'Fine Bethlehem Dining',
    [place_entity_1.PlaceType.CAFE]: 'Bethlehem Cafe Culture',
    [place_entity_1.PlaceType.HOTEL]: 'Bethlehem Hotel Alliance',
    [place_entity_1.PlaceType.ACTIVITY]: 'Bethlehem Outdoor Adventures',
    [place_entity_1.PlaceType.PARK]: 'Bethlehem Outdoor Adventures',
    [place_entity_1.PlaceType.SHOP]: 'Bethlehem Art & Souvenirs',
};
const PLACES = [
    {
        name: 'Church of the Nativity',
        description: 'The world-famous basilica built over the grotto where Jesus is believed to have been born. Located in Manger Square, it is a UNESCO World Heritage site and a focal point for pilgrims.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7044,
        longitude: 35.2076,
        tags: ['heritage', 'religious', 'historic', 'unesco'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('06:30', '19:30'),
    },
    {
        name: 'Manger Square',
        description: 'The central plaza of Bethlehem, located in front of the Church of the Nativity. The square is surrounded by historic buildings and the Mosque of Omar.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7039,
        longitude: 35.2068,
        tags: ['heritage', 'culture', 'family-friendly', 'historic'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('00:00', '23:59'),
    },
    {
        name: 'Milk Grotto',
        description: 'A Franciscan chapel built over a white limestone grotto where the Holy Family took refuge. Known for its distinct white-colored stone.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7033,
        longitude: 35.209,
        tags: ['religious', 'heritage', 'culture'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '17:00'),
    },
    {
        name: "St. Catherine's Church",
        description: 'A Roman Catholic church adjacent to the Basilica of the Nativity, famous for hosting the Midnight Mass on Christmas Eve.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7042,
        longitude: 35.2079,
        tags: ['religious', 'heritage', 'historic'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '18:00'),
    },
    {
        name: 'Mosque of Omar',
        description: "The only mosque in Bethlehem's Old City, located on Manger Square. Built in 1860 and named after the second Caliph, Omar ibn al-Khattab.",
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7037,
        longitude: 35.2061,
        tags: ['religious', 'heritage', 'historic'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('05:00', '21:00'),
    },
    {
        name: 'Mar Saba Monastery',
        description: 'A spectacular Greek Orthodox monastery built into the cliffs of the Kidron Valley. Founded in 483 AD, it is one of the oldest inhabited monasteries.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7047,
        longitude: 35.3313,
        tags: ['religious', 'heritage', 'historic', 'monastery', 'panoramic'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '16:00'),
    },
    {
        name: 'Herodium (Jabal al-Fureidis)',
        description: 'A massive fortress and palace-tomb built by Herod the Great. It offers panoramic views of the Judean Desert and Bethlehem outskirts.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.6658,
        longitude: 35.2414,
        tags: ['archaeology', 'historic', 'panoramic', 'outdoors'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 25, currencyCode: 'ILS', perPerson: true },
        openingHours: buildWeeklyHours('08:00', '17:00'),
    },
    {
        name: 'Shepherds Field Chapel',
        description: 'Located in Beit Sahour, this site marks where angels announced the birth of Jesus to the shepherds. Features a chapel designed like a tent.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.708,
        longitude: 35.221,
        tags: ['religious', 'heritage', 'historic', 'beit-sahour'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '17:30'),
    },
    {
        name: "Solomon's Pools",
        description: 'Three historic reservoirs near Al-Khader that supplied water to Jerusalem. Surrounded by pine forests and the Al-Burak Castle.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.687,
        longitude: 35.199,
        tags: ['historic', 'nature', 'hiking', 'heritage'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 10, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '18:00'),
    },
    {
        name: 'Battir Terraces',
        description: 'A UNESCO World Heritage site known for its ancient irrigation systems and stone terraces still used for traditional agriculture.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.722,
        longitude: 35.138,
        tags: ['unesco', 'nature', 'hiking', 'heritage'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('00:00', '23:59'),
    },
    {
        name: 'Cremisan Monastery and Winery',
        description: 'Located in Beit Jala, this monastery has been producing local wine since 1885 and offers beautiful views of the terraced valley.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.715,
        longitude: 35.176,
        tags: ['winery', 'nature', 'heritage', 'beit-jala'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('09:00', '17:00'),
    },
    {
        name: 'St. Nicholas Church (Mar Nicola)',
        description: 'The main Greek Orthodox church in Beit Jala, built over a cave where Saint Nicholas is said to have lived.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7167,
        longitude: 35.1833,
        tags: ['religious', 'historic', 'beit-jala', 'heritage'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('08:00', '18:00'),
    },
    {
        name: 'Star Street',
        description: "One of Bethlehem's oldest streets, historically used as the pilgrim path to the Church of the Nativity. A UNESCO site with beautiful architecture.",
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7058,
        longitude: 35.2045,
        tags: ['historic', 'unesco', 'walking-tour', 'architecture'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('00:00', '23:59'),
    },
    {
        name: 'The Walled Off Hotel',
        description: 'Created by Banksy, this boutique hotel and museum is located next to the separation wall and features significant satirical art.',
        type: place_entity_1.PlaceType.HOTEL,
        latitude: 31.7202,
        longitude: 35.1996,
        tags: ['art', 'culture', 'modern-history', 'landmark'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 600, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('09:00', '21:00'),
    },
    {
        name: 'Hosh Al-Syrian Guesthouse',
        description: 'A restored traditional house in the Old City of Bethlehem, offering a boutique stay and authentic Palestinian fusion cuisine.',
        type: place_entity_1.PlaceType.HOTEL,
        latitude: 31.7052,
        longitude: 35.2038,
        tags: ['boutique', 'old-city', 'heritage', 'luxury'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 450, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('00:00', '23:59'),
    },
    {
        name: 'Afteem Restaurant',
        description: 'Established in 1948, this legendary restaurant near Manger Square is famous for its authentic falafel, hummus, and traditional breakfast.',
        type: place_entity_1.PlaceType.RESTAURANT,
        latitude: 31.7041,
        longitude: 35.206,
        tags: ['food', 'local-cuisine', 'historic', 'family-friendly'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 35, currencyCode: 'ILS', perPerson: true },
        openingHours: buildWeeklyHours('08:00', '22:00'),
    },
    {
        name: 'Fawda Restaurant',
        description: 'A contemporary restaurant in Beit Jala known for its creative take on Palestinian farm-to-table cuisine.',
        type: place_entity_1.PlaceType.RESTAURANT,
        latitude: 31.715,
        longitude: 35.188,
        tags: ['food', 'fine-dining', 'culture', 'beit-jala'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 100, currencyCode: 'ILS', perPerson: true },
        openingHours: buildWeeklyHours('12:00', '23:00'),
    },
    {
        name: 'Al-Bad Museum',
        description: 'An olive oil museum in the Old City of Bethlehem, showcasing traditional oil extraction methods in a historic building.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7048,
        longitude: 35.2035,
        tags: ['museum', 'culture', 'historic', 'old-city'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 10, currencyCode: 'ILS', perPerson: true },
        openingHours: buildWeeklyHours('09:00', '15:30'),
    },
    {
        name: 'Old City of Beit Sahour',
        description: 'The historic core of Beit Sahour, featuring traditional limestone houses and narrow winding streets.',
        type: place_entity_1.PlaceType.LANDMARK,
        latitude: 31.7031,
        longitude: 35.2258,
        tags: ['beit-sahour', 'historic', 'heritage', 'local-life'],
        isActive: true,
        isVerified: true,
        pricing: { basePrice: 0, currencyCode: 'ILS', perPerson: false },
        openingHours: buildWeeklyHours('00:00', '23:59'),
    },
];
async function seedBethlehem(dataSource) {
    const result = {
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
    const logCreated = (key) => {
        result.created[key] += 1;
    };
    const logSkipped = (key) => {
        result.skipped[key] += 1;
    };
    try {
        const cityRepo = dataSource.getRepository(city_entity_1.City);
        const countryRepo = dataSource.getRepository(country_entity_1.Country);
        const tagRepo = dataSource.getRepository(tag_entity_1.Tag);
        const providerRepo = dataSource.getRepository(provider_entity_1.Provider);
        const placeRepo = dataSource.getRepository(place_entity_1.Place);
        const pricingRepo = dataSource.getRepository(placepricing_entity_1.PlacePricing);
        const openingHourRepo = dataSource.getRepository(place_opening_hour_entity_1.PlaceOpeningHour);
        const country = await countryRepo.findOne({
            where: [
                { alpha2Code: 'PS' },
                { name: 'Palestine' },
                { name: 'State of Palestine' },
            ],
        });
        if (!country) {
            throw new Error('Country not found');
        }
        let city = await cityRepo.findOne({
            where: { name: BETHLEHEM_CITY.name },
        });
        if (!city) {
            city = cityRepo.create({
                ...BETHLEHEM_CITY,
                country,
            });
            city = await cityRepo.save(city);
            logCreated('city');
        }
        else {
            logSkipped('city');
        }
        const tagByName = new Map();
        for (const tagName of TAGS) {
            let tag = await tagRepo.findOne({ where: { name: tagName } });
            if (!tag) {
                tag = tagRepo.create({ name: tagName });
                tag = await tagRepo.save(tag);
                logCreated('tags');
            }
            else {
                logSkipped('tags');
            }
            tagByName.set(tagName, tag);
        }
        const providerByName = new Map();
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
                logCreated('providers');
            }
            else {
                logSkipped('providers');
            }
            providerByName.set(providerSeed.displayName, provider);
        }
        for (const placeSeed of PLACES) {
            const slug = slugify(placeSeed.name);
            let place = await placeRepo.findOne({ where: { slug } });
            if (!place) {
                const providerName = PROVIDER_BY_PLACE_TYPE[placeSeed.type];
                const provider = providerByName.get(providerName);
                if (!provider)
                    continue;
                const tags = placeSeed.tags
                    .map((tagName) => tagByName.get(tagName))
                    .filter((t) => !!t);
                place = placeRepo.create({
                    ...placeSeed,
                    slug,
                    provider,
                    city,
                    tags,
                });
                place = await placeRepo.save(place);
                logCreated('places');
            }
            else {
                logSkipped('places');
            }
            const pricingSeed = placeSeed.pricing;
            const existingPricing = await pricingRepo.findOne({
                where: {
                    place: { id: place.id },
                    basePrice: pricingSeed.basePrice,
                },
            });
            if (!existingPricing) {
                const pricing = pricingRepo.create({
                    ...pricingSeed,
                    place,
                });
                await pricingRepo.save(pricing);
                logCreated('pricings');
            }
            else {
                logSkipped('pricings');
            }
            for (const hour of placeSeed.openingHours) {
                const existingHour = await openingHourRepo.findOne({
                    where: {
                        place: { id: place.id },
                        dayOfWeek: hour.dayOfWeek,
                    },
                });
                if (!existingHour) {
                    const openingHour = openingHourRepo.create({
                        ...hour,
                        place,
                    });
                    await openingHourRepo.save(openingHour);
                    logCreated('openingHours');
                }
                else {
                    logSkipped('openingHours');
                }
            }
        }
        return result;
    }
    catch (error) {
        throw error;
    }
}
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function buildWeeklyHours(openTime, closeTime) {
    return Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        openTime,
        closeTime,
    }));
}
//# sourceMappingURL=bethlehem.seed.js.map