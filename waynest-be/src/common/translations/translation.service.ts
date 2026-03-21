import { Injectable } from '@nestjs/common';
import * as countriesData from './countires-data.json';
import * as placesTranslations from './places-translations.json';
import * as currenciesTranslations from './currencies-translations.json';

export type SupportedLanguage = 'en' | 'ar' | 'fr' | 'ru' | 'tr';

@Injectable()
export class TranslationService {
  private supportedLanguages: SupportedLanguage[] = [
    'en',
    'ar',
    'fr',
    'ru',
    'tr',
  ];
  private defaultLanguage: SupportedLanguage = 'en';

  // Cache for country translations - ISO2 code -> translated name
  private countryTranslations: Map<string, Map<string, string>> = new Map();
  // Cache for city translations - lowercase city name -> translated name
  private cityTranslations: Map<string, Map<string, string>> = new Map();
  // Cache for state translations
  private stateTranslations: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.loadCountryTranslations();
  }

  private loadCountryTranslations() {
    // Initialize maps for each language
    this.supportedLanguages.forEach((lang) => {
      this.countryTranslations.set(lang, new Map());
      this.cityTranslations.set(lang, new Map());
      this.stateTranslations.set(lang, new Map());
    });

    // countriesData is an array - handle both direct array and default export
    let countries: any[] = Array.isArray(countriesData) 
      ? countriesData 
      : (countriesData as any).default;

    if (!Array.isArray(countries)) {
      console.error('[TranslationService] countriesData is not a valid array, got:', typeof countriesData);
      return;
    }

    countries.forEach((country: any) => {
      const iso2 = country.iso2;
      const name = country.name;

      // Load English (default) country name
      const enMap = this.countryTranslations.get('en');
      if (enMap && iso2) {
        enMap.set(iso2.toUpperCase(), name);
        enMap.set(iso2.toLowerCase(), name);
      }

      // Load translations for other languages
      if (country.translations) {
        const translationMap: Record<string, string> = country.translations;

        // Arabic
        if (translationMap['ar']) {
          const arMap = this.countryTranslations.get('ar');
          if (arMap) {
            arMap.set(iso2.toUpperCase(), translationMap['ar']);
            arMap.set(iso2.toLowerCase(), translationMap['ar']);
          }
        }

        // French
        if (translationMap['fr']) {
          const frMap = this.countryTranslations.get('fr');
          if (frMap) {
            frMap.set(iso2.toUpperCase(), translationMap['fr']);
            frMap.set(iso2.toLowerCase(), translationMap['fr']);
          }
        }

        // Russian
        if (translationMap['ru']) {
          const ruMap = this.countryTranslations.get('ru');
          if (ruMap) {
            ruMap.set(iso2.toUpperCase(), translationMap['ru']);
            ruMap.set(iso2.toLowerCase(), translationMap['ru']);
          }
        }

        // Turkish
        if (translationMap['tr']) {
          const trMap = this.countryTranslations.get('tr');
          if (trMap) {
            trMap.set(iso2.toUpperCase(), translationMap['tr']);
            trMap.set(iso2.toLowerCase(), translationMap['tr']);
          }
        }
      }

      // Load states and cities
      if (country.states && Array.isArray(country.states)) {
        country.states.forEach((state: any) => {
          // Load state name
          if (state.name) {
            const stateEnMap = this.stateTranslations.get('en');
            if (stateEnMap) {
              stateEnMap.set(state.name.toLowerCase(), state.name);
            }
          }

          // Load cities within state
          if (state.cities && Array.isArray(state.cities)) {
            state.cities.forEach((city: any) => {
              if (city.name) {
                const cityEnMap = this.cityTranslations.get('en');
                if (cityEnMap) {
                  cityEnMap.set(city.name.toLowerCase(), city.name);
                }
              }
            });
          }
        });
      }
    });

    console.log(
      `[TranslationService] Loaded ${this.countryTranslations.get('en')?.size || 0} countries`,
    );
    console.log(
      `[TranslationService] Loaded ${this.cityTranslations.get('en')?.size || 0} cities`,
    );
    console.log(
      `[TranslationService] Loaded ${this.stateTranslations.get('en')?.size || 0} states`,
    );
  }

  /**
   * Get translation for a country by ISO2 code
   */
  getCountryTranslation(countryCode: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations = this.countryTranslations.get(lang);
    const enTranslations = this.countryTranslations.get('en');
    if (!translations) return countryCode;

    const upperCode = countryCode.toUpperCase();
    const lowerCode = countryCode.toLowerCase();

    return (
      translations.get(upperCode) ||
      translations.get(lowerCode) ||
      enTranslations?.get(upperCode) ||
      enTranslations?.get(lowerCode) ||
      countryCode
    );
  }

  /**
   * Get translation for a city
   */
  getCityTranslation(cityName: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations = this.cityTranslations.get(lang);
    const enTranslations = this.cityTranslations.get('en');
    if (!translations) return cityName;

    const lowerName = cityName.toLowerCase();

    return (
      translations.get(lowerName) || enTranslations?.get(lowerName) || cityName
    );
  }

  /**
   * Get translation for a region/state
   */
  getStateTranslation(stateName: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations = this.stateTranslations.get(lang);
    const enTranslations = this.stateTranslations.get('en');
    if (!translations) return stateName;

    const lowerName = stateName.toLowerCase();

    return (
      translations.get(lowerName) || enTranslations?.get(lowerName) || stateName
    );
  }

  /**
   * Get translation for a region
   */
  getRegionTranslation(region: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const regionTranslations: Record<
      SupportedLanguage,
      Record<string, string>
    > = {
      en: {
        Asia: 'Asia',
        Europe: 'Europe',
        Africa: 'Africa',
        Americas: 'Americas',
        Oceania: 'Oceania',
      },
      ar: {
        Asia: 'آسيا',
        Europe: 'أوروبا',
        Africa: 'أفريقيا',
        Americas: 'الأمريكتين',
        Oceania: 'أوقيانوسيا',
      },
      fr: {
        Asia: 'Asie',
        Europe: 'Europe',
        Africa: 'Afrique',
        Americas: 'Amériques',
        Oceania: 'Océanie',
      },
      ru: {
        Asia: 'Азия',
        Europe: 'Европа',
        Africa: 'Африка',
        Americas: 'Америка',
        Oceania: 'Океания',
      },
      tr: {
        Asia: 'Asya',
        Europe: 'Avrupa',
        Africa: 'Afrika',
        Americas: 'Amerika',
        Oceania: 'Okyanusya',
      },
    };
    return regionTranslations[lang]?.[region] || region;
  }

  /**
   * Get translation for a place
   */
  getPlaceTranslation(placeSlug: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    if (!translations) return placeSlug;
    return (translations as any)?.places?.[placeSlug] || placeSlug;
  }

  /**
   * Get translation for a provider
   */
  getProviderTranslation(
    providerSlug: string,
    language: string = 'en',
  ): string {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    if (!translations) return providerSlug;
    return (translations as any)?.providers?.[providerSlug] || providerSlug;
  }

  /**
   * Get translation for a tag
   */
  getTagTranslation(tagName: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    if (!translations) return tagName;
    return (translations as any)?.tags?.[tagName] || tagName;
  }

  /**
   * Get translation for a place type
   */
  getPlaceTypeTranslation(placeType: string, language: string = 'en'): string {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    if (!translations) return placeType;
    return (translations as any)?.placeTypes?.[placeType] || placeType;
  }

  /**
   * Get translation for a currency
   */
  getCurrencyTranslation(
    currencyCode: string,
    language: string = 'en',
  ): string {
    const lang = this.getValidLanguage(language);
    const translations =
      currenciesTranslations[lang as keyof typeof currenciesTranslations];
    if (!translations) return currencyCode;
    return (
      (translations as any)?.[currencyCode] ||
      (translations as any)?.[currencyCode.toUpperCase()] ||
      currencyCode
    );
  }

  /**
   * Get all countries as an object
   */
  getAllCountries(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const map = this.countryTranslations.get(lang);
    if (!map) return {};

    const result: Record<string, string> = {};
    map.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Get all cities as an object
   */
  getAllCities(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const map = this.cityTranslations.get(lang);
    if (!map) return {};

    const result: Record<string, string> = {};
    map.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Get all regions
   */
  getAllRegions(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const regionTranslations: Record<
      SupportedLanguage,
      Record<string, string>
    > = {
      en: {
        Asia: 'Asia',
        Europe: 'Europe',
        Africa: 'Africa',
        Americas: 'Americas',
        Oceania: 'Oceania',
      },
      ar: {
        Asia: 'آسيا',
        Europe: 'أوروبا',
        Africa: 'أفريقيا',
        Americas: 'الأمريكتين',
        Oceania: 'أوقيانوسيا',
      },
      fr: {
        Asia: 'Asie',
        Europe: 'Europe',
        Africa: 'Afrique',
        Americas: 'Amériques',
        Oceania: 'Océanie',
      },
      ru: {
        Asia: 'Азия',
        Europe: 'Европа',
        Africa: 'Африка',
        Americas: 'Америка',
        Oceania: 'Океания',
      },
      tr: {
        Asia: 'Asya',
        Europe: 'Avrupa',
        Africa: 'Afrika',
        Americas: 'Amerika',
        Oceania: 'Okyanusya',
      },
    };
    return regionTranslations[lang] || regionTranslations['en'];
  }

  /**
   * Get all places
   */
  getAllPlaces(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    return (translations as any)?.places || {};
  }

  /**
   * Get all tags
   */
  getAllTags(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    return (translations as any)?.tags || {};
  }

  /**
   * Get all place types
   */
  getAllPlaceTypes(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const translations =
      placesTranslations[lang as keyof typeof placesTranslations];
    return (translations as any)?.placeTypes || {};
  }

  /**
   * Get all currencies
   */
  getAllCurrencies(language: string = 'en'): Record<string, string> {
    const lang = this.getValidLanguage(language);
    const translations =
      currenciesTranslations[lang as keyof typeof currenciesTranslations];
    return (translations as any) || {};
  }

  /**
   * Validate and return a supported language
   */
  private getValidLanguage(language: string): SupportedLanguage {
    const lang = language?.toLowerCase() as SupportedLanguage;
    return this.supportedLanguages.includes(lang) ? lang : this.defaultLanguage;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return [...this.supportedLanguages];
  }
}
