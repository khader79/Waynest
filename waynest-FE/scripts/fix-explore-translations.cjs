#!/usr/bin/env node
/**
 * 🌐 Fix Missing Translations - Using Correct Keys
 * Adds translations under 'explore' namespace as used by Explore.jsx
 */

const fs = require("fs");
const path = require("path");

const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");

// Complete translation definitions using correct 'explore' namespace
const TRANSLATIONS_DATA = {
  explore: {
    hero: {
      description: {
        en: "This page stays focused on discovery. Browse the catalog, search public providers, and open details without the social clutter.",
        ar: "تركز هذه الصفحة على الاستكشاف. تصفح الكتالوج، ابحث عن مزودي الخدمات، واستكشف التفاصيل بدون الفوضى الاجتماعية",
        fr: "Cette page se concentre sur la découverte. Parcourez le catalogue, recherchez les fournisseurs publics et ouvrez les détails sans le désordre social",
        ru: "Эта страница сосредоточена на открытии. Просмотрите каталог, ищите общественных поставщиков и откройте детали без социального беспорядка",
        tr: "Bu sayfa keşif üzerine odaklanmıştır. Kataloğu gezin, genel sağlayıcıları arayın ve sosyal karışıklık olmadan detayları açın",
      },
    },
    search: {
      title: {
        en: "Search the public catalog",
        ar: "ابحث في الكتالوج العام",
        fr: "Rechercher dans le catalogue public",
        ru: "Поиск в общественном каталоге",
        tr: "Genel kataloğu ara",
      },
      placeholder: {
        en: "Search providers, places, and events...",
        ar: "ابحث عن مزودي الخدمات والأماكن والأحداث...",
        fr: "Rechercher des fournisseurs, des lieux et des événements...",
        ru: "Искать поставщиков, места и события...",
        tr: "Sağlayıcılar, yerler ve etkinlikleri ara...",
      },
      loading: {
        en: "Searching...",
        ar: "جاري البحث...",
        fr: "Recherche en cours...",
        ru: "Поиск...",
        tr: "Aranıyor...",
      },
    },
    categories: {
      events: {
        en: "Events",
        ar: "الأحداث",
        fr: "Événements",
        ru: "События",
        tr: "Etkinlikler",
      },
      all: {
        en: "All",
        ar: "الكل",
        fr: "Tout",
        ru: "Все",
        tr: "Hepsi",
      },
    },
    events: {
      title: {
        en: "Events",
        ar: "الأحداث",
        fr: "Événements",
        ru: "События",
        tr: "Etkinlikler",
      },
      emptyMessage: {
        en: "No upcoming events right now. Check back later.",
        ar: "لا توجد أحداث قادمة في الوقت الحالي. تحقق لاحقاً",
        fr: "Aucun événement à venir pour le moment. Revenez plus tard",
        ru: "Нет предстоящих событий в настоящее время. Проверьте позже",
        tr: "Şu anda yaklaşan etkinlik yok. Daha sonra kontrol edin",
      },
    },
  },
};

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function ensureKeyPath(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

async function main() {
  console.log("🔧 Fixing Translation Keys\n");

  const languages = ["en", "ar", "fr", "ru", "tr"];
  const stats = {};

  for (const lang of languages) {
    stats[lang] = { added: 0, updated: 0 };
    console.log(`📝 Processing ${lang.toUpperCase()}...`);

    const filePath = path.join(LOCALES_PATH, lang, "translation.json");
    const translations = readJSON(filePath);

    if (!translations) {
      console.log(`  ❌ Could not read ${lang}/translation.json`);
      continue;
    }

    // Recursively add translations
    function addTranslations(path, dataObj) {
      for (const [key, value] of Object.entries(dataObj)) {
        const fullPath = path ? `${path}.${key}` : key;

        if (typeof value === "object" && !Array.isArray(value) && value[lang]) {
          // This is a language-specific translation
          ensureKeyPath(translations, fullPath, value[lang]);
          stats[lang].added++;
        } else if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          !value.en
        ) {
          // This is a nested structure, recurse
          addTranslations(fullPath, value);
        }
      }
    }

    // Add all translations
    addTranslations("", TRANSLATIONS_DATA);

    // Save updated translations
    writeJSON(filePath, translations);
    console.log(`  ✅ Updated - Added ${stats[lang].added} keys`);
  }

  console.log("\n✨ All translations fixed successfully!\n");

  console.log("📊 Summary:");
  for (const [lang, stat] of Object.entries(stats)) {
    console.log(`  ${lang.toUpperCase()}: ${stat.added} keys added`);
  }

  console.log("\n🔑 Updated Key Paths:");
  console.log("  - explore.hero.description");
  console.log("  - explore.search.title");
  console.log("  - explore.search.placeholder");
  console.log("  - explore.search.loading");
  console.log("  - explore.categories.events");
  console.log("  - explore.categories.all");
  console.log("  - explore.events.title");
  console.log("  - explore.events.emptyMessage");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
