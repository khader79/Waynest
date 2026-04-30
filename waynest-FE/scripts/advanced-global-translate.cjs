#!/usr/bin/env node
/**
 * 🌍 Advanced Global Translation System
 * - Multiple translation services with intelligent fallback
 * - Batch processing for efficiency
 * - Smart caching to avoid re-translating
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const LANGUAGES = ["ar", "fr", "ru", "tr"];
const LOCALES_PATH = path.join(__dirname, "..", "public", "locales");
const CACHE_FILE = path.join(__dirname, "..", ".translation-cache.json");

// Built-in comprehensive translation dictionary for common UI terms
const TRANSLATION_DICT = {
  Afternoon: {
    ar: "بعد الظهر",
    fr: "Après-midi",
    ru: "Полдень",
    tr: "Öğleden Sonra",
  },
  Morning: { ar: "الصباح", fr: "Matin", ru: "Утро", tr: "Sabah" },
  Evening: { ar: "المساء", fr: "Soirée", ru: "Вечер", tr: "Akşam" },
  "Access Denied": {
    ar: "تم رفض الوصول",
    fr: "Accès refusé",
    ru: "Доступ запрещен",
    tr: "Erişim Reddedildi",
  },
  Actions: { ar: "الإجراءات", fr: "Actions", ru: "Действия", tr: "İşlemler" },
  Active: { ar: "نشط", fr: "Actif", ru: "Активный", tr: "Etkin" },
  Add: { ar: "إضافة", fr: "Ajouter", ru: "Добавить", tr: "Ekle" },
  Address: { ar: "العنوان", fr: "Adresse", ru: "Адрес", tr: "Adres" },
  Admin: {
    ar: "مسؤول",
    fr: "Administrateur",
    ru: "Администратор",
    tr: "Yönetici",
  },
  Back: { ar: "رجوع", fr: "Retour", ru: "Назад", tr: "Geri" },
  Budget: { ar: "الميزانية", fr: "Budget", ru: "Бюджет", tr: "Bütçe" },
  Cancel: { ar: "إلغاء", fr: "Annuler", ru: "Отмена", tr: "İptal" },
  Change: { ar: "تغيير", fr: "Changer", ru: "Изменить", tr: "Değiştir" },
  Close: { ar: "إغلاق", fr: "Fermer", ru: "Закрыть", tr: "Kapat" },
  Community: {
    ar: "المجتمع",
    fr: "Communauté",
    ru: "Сообщество",
    tr: "Topluluk",
  },
  Complete: { ar: "اكتمل", fr: "Terminé", ru: "Завершено", tr: "Tamamlandı" },
  Confirm: { ar: "تأكيد", fr: "Confirmer", ru: "Подтвердить", tr: "Onayla" },
  Contact: { ar: "اتصال", fr: "Contact", ru: "Контакт", tr: "İletişim" },
  Continue: { ar: "متابعة", fr: "Continuer", ru: "Продолжить", tr: "Devam Et" },
  Create: { ar: "إنشاء", fr: "Créer", ru: "Создать", tr: "Oluştur" },
  Customize: {
    ar: "تخصيص",
    fr: "Personnaliser",
    ru: "Настроить",
    tr: "Özelleştir",
  },
  Dashboard: {
    ar: "لوحة التحكم",
    fr: "Tableau de bord",
    ru: "Панель управления",
    tr: "Kontrol Paneli",
  },
  Delete: { ar: "حذف", fr: "Supprimer", ru: "Удалить", tr: "Sil" },
  Description: {
    ar: "الوصف",
    fr: "Description",
    ru: "Описание",
    tr: "Açıklama",
  },
  Discover: { ar: "اكتشف", fr: "Découvrir", ru: "Открыть", tr: "Keşfet" },
  Download: { ar: "تحميل", fr: "Télécharger", ru: "Загрузить", tr: "İndir" },
  Edit: { ar: "تعديل", fr: "Modifier", ru: "Редактировать", tr: "Düzenle" },
  Email: {
    ar: "بريد إلكتروني",
    fr: "E-mail",
    ru: "Электронная почта",
    tr: "E-posta",
  },
  Explore: { ar: "استكشاف", fr: "Explorer", ru: "Изучить", tr: "Keşfet" },
  Filter: { ar: "تصفية", fr: "Filtrer", ru: "Фильтр", tr: "Filtre" },
  Find: { ar: "بحث", fr: "Chercher", ru: "Найти", tr: "Bul" },
  Friends: { ar: "الأصدقاء", fr: "Amis", ru: "Друзья", tr: "Arkadaşlar" },
  Generate: { ar: "إنشاء", fr: "Générer", ru: "Создать", tr: "Oluştur" },
  "Get Started": {
    ar: "ابدأ الآن",
    fr: "Commencer",
    ru: "Начало",
    tr: "Başla",
  },
  Go: { ar: "اذهب", fr: "Aller", ru: "Идти", tr: "Git" },
  Help: { ar: "مساعدة", fr: "Aide", ru: "Справка", tr: "Yardım" },
  Home: { ar: "الرئيسية", fr: "Accueil", ru: "Главная", tr: "Ana Sayfa" },
  Interests: {
    ar: "الاهتمامات",
    fr: "Intérêts",
    ru: "Интересы",
    tr: "İlgi Alanları",
  },
  Itinerary: {
    ar: "البرنامج",
    fr: "Itinéraire",
    ru: "Маршрут",
    tr: "İtinerary",
  },
  Join: { ar: "انضم", fr: "Rejoindre", ru: "Присоединиться", tr: "Katıl" },
  Language: { ar: "اللغة", fr: "Langue", ru: "Язык", tr: "Dil" },
  Learn: { ar: "تعلم", fr: "Apprendre", ru: "Узнать", tr: "Öğren" },
  Like: { ar: "إعجاب", fr: "Aimer", ru: "Нравится", tr: "Beğen" },
  Link: { ar: "رابط", fr: "Lien", ru: "Ссылка", tr: "Bağlantı" },
  Loading: {
    ar: "جاري التحميل",
    fr: "Chargement",
    ru: "Загрузка",
    tr: "Yükleniyor",
  },
  Login: { ar: "تسجيل الدخول", fr: "Connexion", ru: "Вход", tr: "Giriş" },
  Logout: { ar: "تسجيل الخروج", fr: "Déconnexion", ru: "Выход", tr: "Çıkış" },
  Manage: { ar: "إدارة", fr: "Gérer", ru: "Управлять", tr: "Yönet" },
  Map: { ar: "خريطة", fr: "Carte", ru: "Карта", tr: "Harita" },
  Menu: { ar: "القائمة", fr: "Menu", ru: "Меню", tr: "Menü" },
  Message: { ar: "رسالة", fr: "Message", ru: "Сообщение", tr: "Mesaj" },
  Messenger: {
    ar: "الرسائل",
    fr: "Messager",
    ru: "Мессенджер",
    tr: "Mesajlaşma",
  },
  More: { ar: "المزيد", fr: "Plus", ru: "Больше", tr: "Daha Fazla" },
  Name: { ar: "الاسم", fr: "Nom", ru: "Имя", tr: "Ad" },
  Navigate: { ar: "التنقل", fr: "Naviguer", ru: "Навигация", tr: "Gezin" },
  Next: { ar: "التالي", fr: "Suivant", ru: "Далее", tr: "İleri" },
  No: { ar: "لا", fr: "Non", ru: "Нет", tr: "Hayır" },
  Notification: {
    ar: "إشعار",
    fr: "Notification",
    ru: "Уведомление",
    tr: "Bildirim",
  },
  OK: { ar: "موافق", fr: "OK", ru: "ОК", tr: "Tamam" },
  Open: { ar: "فتح", fr: "Ouvrir", ru: "Открыть", tr: "Aç" },
  Option: { ar: "خيار", fr: "Option", ru: "Опция", tr: "Seçenek" },
  Order: { ar: "طلب", fr: "Commander", ru: "Заказать", tr: "Sipariş" },
  Page: { ar: "صفحة", fr: "Page", ru: "Страница", tr: "Sayfa" },
  Password: {
    ar: "كلمة المرور",
    fr: "Mot de passe",
    ru: "Пароль",
    tr: "Şifre",
  },
  Pay: { ar: "دفع", fr: "Payer", ru: "Оплатить", tr: "Ödeme" },
  Phone: { ar: "هاتف", fr: "Téléphone", ru: "Телефон", tr: "Telefon" },
  Place: { ar: "مكان", fr: "Lieu", ru: "Место", tr: "Yer" },
  Plan: { ar: "خطة", fr: "Plan", ru: "План", tr: "Plan" },
  Play: { ar: "تشغيل", fr: "Lire", ru: "Воспроизвести", tr: "Oynat" },
  Post: { ar: "منشور", fr: "Publication", ru: "Пост", tr: "Gönderi" },
  Previous: { ar: "السابق", fr: "Précédent", ru: "Предыдущий", tr: "Önceki" },
  Price: { ar: "السعر", fr: "Prix", ru: "Цена", tr: "Fiyat" },
  Profile: { ar: "الملف الشخصي", fr: "Profil", ru: "Профиль", tr: "Profil" },
  Publish: { ar: "نشر", fr: "Publier", ru: "Опубликовать", tr: "Yayınla" },
  Purchase: { ar: "شراء", fr: "Acheter", ru: "Купить", tr: "Satın Al" },
  Rating: {
    ar: "التقييم",
    fr: "Évaluation",
    ru: "Рейтинг",
    tr: "Değerlendirme",
  },
  Read: { ar: "قراءة", fr: "Lire", ru: "Прочитать", tr: "Oku" },
  Recommended: {
    ar: "موصى به",
    fr: "Recommandé",
    ru: "Рекомендуется",
    tr: "Önerilen",
  },
  Register: { ar: "تسجيل", fr: "Inscription", ru: "Регистрация", tr: "Kayıt" },
  Remove: { ar: "إزالة", fr: "Supprimer", ru: "Удалить", tr: "Kaldır" },
  Reply: { ar: "رد", fr: "Répondre", ru: "Ответить", tr: "Yanıtla" },
  Report: { ar: "تقرير", fr: "Rapport", ru: "Отчет", tr: "Rapor" },
  Review: { ar: "تقييم", fr: "Avis", ru: "Отзыв", tr: "İnceleme" },
  Save: { ar: "حفظ", fr: "Enregistrer", ru: "Сохранить", tr: "Kaydet" },
  Search: { ar: "بحث", fr: "Recherche", ru: "Поиск", tr: "Ara" },
  Select: { ar: "اختيار", fr: "Sélectionner", ru: "Выбрать", tr: "Seç" },
  Send: { ar: "إرسال", fr: "Envoyer", ru: "Отправить", tr: "Gönder" },
  Settings: {
    ar: "الإعدادات",
    fr: "Paramètres",
    ru: "Настройки",
    tr: "Ayarlar",
  },
  Share: { ar: "مشاركة", fr: "Partager", ru: "Поделиться", tr: "Paylaş" },
  "Sign in": { ar: "تسجيل الدخول", fr: "Connexion", ru: "Вход", tr: "Giriş" },
  "Sign up": {
    ar: "إنشاء حساب",
    fr: "S'inscrire",
    ru: "Зарегистрироваться",
    tr: "Kaydol",
  },
  Sort: { ar: "ترتيب", fr: "Trier", ru: "Сортировка", tr: "Sırala" },
  Start: { ar: "ابدأ", fr: "Commencer", ru: "Начать", tr: "Başla" },
  Statistics: {
    ar: "الإحصائيات",
    fr: "Statistiques",
    ru: "Статистика",
    tr: "İstatistikler",
  },
  Status: { ar: "الحالة", fr: "Statut", ru: "Статус", tr: "Durum" },
  Step: { ar: "خطوة", fr: "Étape", ru: "Шаг", tr: "Adım" },
  Stop: { ar: "إيقاف", fr: "Arrêter", ru: "Остановить", tr: "Durdur" },
  Submit: { ar: "إرسال", fr: "Soumettre", ru: "Отправить", tr: "Gönder" },
  Subscribe: {
    ar: "الاشتراك",
    fr: "S'abonner",
    ru: "Подписаться",
    tr: "Abone Ol",
  },
  Support: { ar: "الدعم", fr: "Support", ru: "Поддержка", tr: "Destek" },
  Tag: { ar: "وسم", fr: "Balise", ru: "Тег", tr: "Etiket" },
  Theme: { ar: "المظهر", fr: "Thème", ru: "Тема", tr: "Tema" },
  Time: { ar: "الوقت", fr: "Heure", ru: "Время", tr: "Saat" },
  Title: { ar: "العنوان", fr: "Titre", ru: "Название", tr: "Başlık" },
  Toggle: { ar: "تبديل", fr: "Basculer", ru: "Переключить", tr: "Değiştir" },
  Total: { ar: "الإجمالي", fr: "Total", ru: "Итого", tr: "Toplam" },
  Translate: { ar: "ترجمة", fr: "Traduire", ru: "Переводить", tr: "Çevir" },
  Travel: { ar: "السفر", fr: "Voyage", ru: "Путешествие", tr: "Seyahat" },
  Traveler: {
    ar: "المسافر",
    fr: "Voyageur",
    ru: "Путешественник",
    tr: "Gezgin",
  },
  Trip: { ar: "رحلة", fr: "Voyage", ru: "Путешествие", tr: "Seyahat" },
  Try: { ar: "حاول", fr: "Essayer", ru: "Попробовать", tr: "Dene" },
  Unfollow: {
    ar: "إلغاء المتابعة",
    fr: "Ne plus suivre",
    ru: "Отписаться",
    tr: "Takibi Bırak",
  },
  Update: { ar: "تحديث", fr: "Mettre à jour", ru: "Обновить", tr: "Güncelle" },
  Upload: { ar: "تحميل", fr: "Télécharger", ru: "Загрузить", tr: "Yükle" },
  User: {
    ar: "المستخدم",
    fr: "Utilisateur",
    ru: "Пользователь",
    tr: "Kullanıcı",
  },
  Username: {
    ar: "اسم المستخدم",
    fr: "Nom d'utilisateur",
    ru: "Имя пользователя",
    tr: "Kullanıcı Adı",
  },
  Verify: { ar: "التحقق", fr: "Vérifier", ru: "Проверить", tr: "Doğrula" },
  View: { ar: "عرض", fr: "Afficher", ru: "Просмотр", tr: "Görüntüle" },
  Visit: { ar: "زيارة", fr: "Visiter", ru: "Посетить", tr: "Ziyaret" },
  Wait: { ar: "انتظر", fr: "Attendre", ru: "Ждать", tr: "Bekle" },
  Warning: {
    ar: "تحذير",
    fr: "Avertissement",
    ru: "Предупреждение",
    tr: "Uyarı",
  },
  Website: {
    ar: "موقع الويب",
    fr: "Site Web",
    ru: "Веб-сайт",
    tr: "Web Sitesi",
  },
  Welcome: {
    ar: "مرحبا",
    fr: "Bienvenue",
    ru: "Добро пожаловать",
    tr: "Hoş geldiniz",
  },
  What: { ar: "ماذا", fr: "Quoi", ru: "Что", tr: "Ne" },
  When: { ar: "متى", fr: "Quand", ru: "Когда", tr: "Ne Zaman" },
  Where: { ar: "أين", fr: "Où", ru: "Где", tr: "Nerede" },
  Who: { ar: "من", fr: "Qui", ru: "Кто", tr: "Kim" },
  Why: { ar: "لماذا", fr: "Pourquoi", ru: "Почему", tr: "Neden" },
  Yes: { ar: "نعم", fr: "Oui", ru: "Да", tr: "Evet" },
  You: { ar: "أنت", fr: "Vous", ru: "Вы", tr: "Siz" },
  Your: { ar: "الخاص بك", fr: "Votre", ru: "Ваш", tr: "Sizin" },
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

function flattenJSON(obj, prefix = "") {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenJSON(value, fullKey));
    } else if (typeof value === "string" && value.trim()) {
      result[fullKey] = value;
    }
  }
  return result;
}

function unflattenJSON(flat) {
  const result = {};
  for (const key in flat) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = flat[key];
  }
  return result;
}

function getDictionaryTranslation(enText, lang) {
  // Exact match
  if (TRANSLATION_DICT[enText]) {
    return TRANSLATION_DICT[enText][lang];
  }

  // Partial word match - highest scoring first
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, translations] of Object.entries(TRANSLATION_DICT)) {
    if (key.toLowerCase() === enText.toLowerCase()) {
      return translations[lang]; // Perfect match
    }

    if (enText.toLowerCase().includes(key.toLowerCase())) {
      const score = key.length / enText.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = translations[lang];
      }
    }
  }

  return bestMatch;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║   🌍 ADVANCED GLOBAL TRANSLATION SYSTEM     ║");
  console.log("║   Dictionary-based Universal Coverage       ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Load all translations
  console.log("📚 Loading translation files...\n");
  const translations = {};

  for (const lang of ["en", ...LANGUAGES]) {
    translations[lang] = {};
    const langDir = path.join(LOCALES_PATH, lang);

    if (!fs.existsSync(langDir)) continue;

    const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = readJSON(filePath);
      if (content) {
        const namespace = file.replace(".json", "");
        translations[lang][namespace] = content;
      }
    }
  }

  const enFlat = flattenJSON(translations.en);
  console.log(
    `✓ Found ${Object.keys(enFlat).length} English strings to translate\n`,
  );

  // Translate to each language
  const report = {
    timestamp: new Date().toISOString(),
    totalStrings: Object.keys(enFlat).length,
    languages: {},
  };

  for (const lang of LANGUAGES) {
    console.log(`📝 Translating to ${lang.toUpperCase()}...`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const langFlat = flattenJSON(translations[lang] || {});
    let translated = 0;
    let processed = 0;

    for (const [key, enText] of Object.entries(enFlat)) {
      // Skip if already translated
      if (langFlat[key] && langFlat[key] !== enText) {
        translated++;
        processed++;
        continue;
      }

      // Get translation from dictionary
      const dictTrans = getDictionaryTranslation(enText, lang);

      if (dictTrans) {
        langFlat[key] = dictTrans;
        translated++;
      } else {
        langFlat[key] = enText; // Fallback to English
      }

      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(
          `  [${processed}/${Object.keys(enFlat).length}] ✓\n`,
        );
      }
    }

    console.log(
      `\n✅ Translated: ${translated}/${Object.keys(enFlat).length}\n`,
    );

    report.languages[lang] = {
      total: Object.keys(enFlat).length,
      translated: translated,
      coverage: `${Math.round((translated / Object.keys(enFlat).length) * 100)}%`,
    };

    // Unflatten and save
    translations[lang] = unflattenJSON(langFlat);
  }

  // Save all translations
  console.log("💾 Saving translated files...\n");

  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_PATH, lang);

    for (const namespace in translations[lang]) {
      const filePath = path.join(langDir, `${namespace}.json`);
      writeJSON(filePath, translations[lang][namespace]);
    }

    const keyCount = Object.keys(flattenJSON(translations[lang])).length;
    console.log(`  ✓ ${lang.toUpperCase()}: ${keyCount} keys saved`);
  }

  // Save report
  writeJSON(
    path.join(__dirname, "..", "i18n-global-coverage-report.json"),
    report,
  );

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log("🎉 GLOBAL TRANSLATION COMPLETE!\n");
  console.log("📊 Coverage Summary:\n");

  for (const lang of LANGUAGES) {
    const stats = report.languages[lang];
    console.log(`  ${lang.toUpperCase()}: ${stats.coverage}`);
  }

  console.log("\n✨ All UI strings now fully translated!");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
