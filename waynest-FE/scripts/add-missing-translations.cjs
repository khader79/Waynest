#!/usr/bin/env node
/**
 * 🌐 Complete Missing Translations Filler
 * Adds all missing translations from the screenshot
 */

const fs = require("fs");
const path = require("path");

const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");

// Missing translations with complete text
const MISSING_TRANSLATIONS = {
  discover: {
    // This page description
    description: {
      en: "This page stays focused on discovery. Browse the catalog, search public providers, and open details without the social clutter",
      ar: "تركز هذه الصفحة على الاستكشاف. تصفح الكتالوج، ابحث عن مزودي الخدمات، واستكشف التفاصيل بدون الفوضى الاجتماعية",
      fr: "Cette page se concentre sur la découverte. Parcourez le catalogue, recherchez les fournisseurs publics et ouvrez les détails sans le désordre social",
      ru: "Эта страница сосредоточена на открытии. Просмотрите каталог, ищите общественных поставщиков и откройте детали без социального беспорядка",
      tr: "Bu sayfa keşif üzerine odaklanmıştır. Kataloğu gezin, genel sağlayıcıları arayın ve sosyal karışıklık olmadan detayları açın",
    },

    // Search heading
    searchHeading: {
      en: "Search the public catalog",
      ar: "ابحث في الكتالوج العام",
      fr: "Rechercher dans le catalogue public",
      ru: "Поиск в общественном каталоге",
      tr: "Genel kataloğu ara",
    },

    // Search placeholder
    searchPlaceholder: {
      en: "Search providers, places, and events",
      ar: "ابحث عن مزودي الخدمات والأماكن والأحداث",
      fr: "Rechercher des fournisseurs, des lieux et des événements",
      ru: "Искать поставщиков, места и события",
      tr: "Sağlayıcılar, yerler ve etkinlikleri ara",
    },

    // Events tab
    eventsTab: {
      en: "Events",
      ar: "الأحداث",
      fr: "Événements",
      ru: "События",
      tr: "Etkinlikler",
    },

    // All tab
    allTab: {
      en: "All",
      ar: "الكل",
      fr: "Tout",
      ru: "Все",
      tr: "Hepsi",
    },

    // No events message
    noEventsMessage: {
      en: "No upcoming events right now. Check back later",
      ar: "لا توجد أحداث قادمة في الوقت الحالي. تحقق لاحقاً",
      fr: "Aucun événement à venir pour le moment. Revenez plus tard",
      ru: "Нет предстоящих событий в настоящее время. Проверьте позже",
      tr: "Şu anda yaklaşan etkinlik yok. Daha sonra kontrol edin",
    },
  },
};

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return null;
  }
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

async function main() {
  console.log("🌐 Adding Missing Translations\n");

  const languages = ["en", "ar", "fr", "ru", "tr"];

  for (const lang of languages) {
    console.log(`📝 Processing ${lang.toUpperCase()}...`);

    const filePath = path.join(LOCALES_PATH, lang, "translation.json");
    const translations = readJSON(filePath);

    if (!translations) {
      console.log(`  ❌ Could not read ${lang}/translation.json`);
      continue;
    }

    // Ensure discover section exists
    if (!translations.discover) {
      translations.discover = {};
    }

    // Add missing translations
    if (!translations.discover.description) {
      translations.discover.description =
        MISSING_TRANSLATIONS.discover.description[lang];
    }

    if (!translations.discover.searchHeading) {
      translations.discover.searchHeading =
        MISSING_TRANSLATIONS.discover.searchHeading[lang];
    }

    if (!translations.discover.searchPlaceholder) {
      translations.discover.searchPlaceholder =
        MISSING_TRANSLATIONS.discover.searchPlaceholder[lang];
    }

    if (!translations.discover.eventsTab) {
      translations.discover.eventsTab =
        MISSING_TRANSLATIONS.discover.eventsTab[lang];
    }

    if (!translations.discover.allTab) {
      translations.discover.allTab = MISSING_TRANSLATIONS.discover.allTab[lang];
    }

    if (!translations.discover.noEventsMessage) {
      translations.discover.noEventsMessage =
        MISSING_TRANSLATIONS.discover.noEventsMessage[lang];
    }

    // Save updated translations
    writeJSON(filePath, translations);
    console.log(`  ✅ Updated ${lang}/translation.json`);
  }

  console.log("\n✨ All missing translations added successfully!\n");
  console.log("Updated keys:");
  console.log("  - discover.description");
  console.log("  - discover.searchHeading");
  console.log("  - discover.searchPlaceholder");
  console.log("  - discover.eventsTab");
  console.log("  - discover.allTab");
  console.log("  - discover.noEventsMessage");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
