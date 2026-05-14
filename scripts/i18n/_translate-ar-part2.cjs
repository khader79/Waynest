const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.resolve(__dirname, '../../waynest-FE/public/locales');
function setDeep(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
function apply(lang, patches) {
  const fPath = path.join(LOCALE_DIR, lang, 'translation.json');
  const data = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
  for (const [key, value] of Object.entries(patches)) {
    setDeep(data, key, value);
  }
  fs.writeFileSync(fPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Patched ${Object.keys(patches).length} keys for ${lang}`);
}

apply('ar', {
  // about
  'about.hero.title': 'حول Waynest',
  'about.hero.subtitle': 'رفيقك الموثوق لاكتشاف الوجهات الرائعة حول العالم',

  // destinations
  'destinations.hero.eyebrow': 'استكشف العالم',
  'destinations.hero.title': 'اكتشف الوجهات',
  'destinations.hero.subtitle': 'استكشف دولاً ومدناً رائعة حول العالم',
  'destinations.hero.searchPlaceholder': 'ابحث عن وجهات أو مدن أو عواصم...',
  'destinations.regions.americas': 'الأمريكتان',
  'destinations.labels.cities': 'المدن:',
  'destinations.labels.more': 'المزيد',
  'destinations.filtersNav': 'تصفية حسب المنطقة',
  'destinations.loading': 'جارٍ تحميل الوجهات...',
  'destinations.emptyState': 'لم يتم العثور على وجهات. حاول تعديل البحث أو عوامل التصفية.',

  // explore
  'explore.hero.title': 'استكشف الأماكن',
  'explore.hero.subtitle': 'اكتشف وجهات رائعة حول العالم',
  'explore.hero.searchPlaceholder': 'ابحث عن أماكن...',
  'explore.hero.googleUnavailable': 'بحث Google Places غير متاح في هذه البيئة.',
  'explore.hero.description': 'تركز هذه الصفحة على الاستكشاف. تصفح الكتالوج، ابحث عن مقدمي الخدمات، واطلع على التفاصيل دون الضوضاء الاجتماعية.',
  'explore.categories.historical': 'تاريخي',
  'explore.search.title': 'ابحث في الكتالوج العام',
  'explore.search.placeholder': 'ابحث عن مقدمي الخدمات والأماكن والفعاليات...',
  'explore.search.loading': 'جارٍ البحث...',
  'explore.events.emptyMessage': 'لا توجد فعاليات قادمة حالياً. تحقق لاحقاً.',
  'explore.emptyState': 'لم يتم العثور على أماكن',

  // navbar
  'navbar.notificationsMenu': 'الإشعارات',
  'navbar.notificationsSeeAll': 'عرض كل الإشعارات',
  'navbar.userPanel': 'لوحة المستخدم',
  'navbar.providerPanel': 'حساب الأعمال',
  'navbar.businessAccount': 'حساب الأعمال',
  'navbar.welcome': 'مرحباً',
  'navbar.toggleSidebar': 'تبديل الشريط الجانبي',
  'navbar.closeSidebar': 'إغلاق الشريط الجانبي',
  'navbar.providerProfileSection': 'ملف مقدم الخدمة',
  'navbar.backToFeed': 'العودة إلى الخلاصة',
  'navbar.personalAccount': 'حساب شخصي',

  // user sidebar
  'user.sidebar.bookings': 'الحجوزات',

  // user dashboard
  'user.dashboard.myBookings': 'حجوزاتي',
  'user.dashboard.myReviews': 'تقييماتي',
  'user.dashboard.profileStatus': 'حالة الملف الشخصي',
  'user.dashboard.active': 'نشط',

  // user wishlist
  'user.wishlist.empty': 'قائمة رغباتك فارغة',
  'user.wishlist.emptyAction': 'ابدأ الاستكشاف!',
  'user.wishlist.exploreButton': 'استكشف الأماكن',
  'user.wishlist.remove': 'إزالة',
  'user.wishlist.rating': 'التقييم',

  // user bookings
  'user.bookings.title': 'حجوزاتي',
  'user.bookings.empty': 'لا توجد حجوزات بعد',
  'user.bookings.emptyAction': 'استكشف الأماكن لحجز زيارتك!',
  'user.bookings.exploreButton': 'استكشف الأماكن',
  'user.bookings.persons': 'أشخاص',
  'user.bookings.status.confirmed': 'مؤكد',
  'user.bookings.status.cancelled': 'ملغي',
  'user.bookings.status.completed': 'مكتمل',

  // user profile
  'user.profile.title': 'ملفك الشخصي',
  'user.profile.subtitle': 'حافظ على بياناتك الشخصية محدثة دائماً.',
  'user.profile.phone': 'الهاتف',
  'user.profile.saveChanges': 'حفظ التغييرات',

  // user trip planner
  'user.tripPlanner.title': 'مخطط الرحلات بالذكاء الاصطناعي',
  'user.tripPlanner.planYourTrip': 'خطط لرحلتك المثالية',

  // provider sidebar
  'provider.sidebar.createPost': 'إنشاء منشور',
  'provider.sidebar.sectionOverview': 'نظرة عامة',
  'provider.sidebar.sectionOperations': 'العمليات',
  'provider.sidebar.sectionPresence': 'التواجد',
  'provider.sidebar.sectionAccount': 'الحساب',
  'provider.sidebar.publicPage': 'الصفحة العامة',
  'provider.sidebar.businessSettings': 'إعدادات النشاط التجاري',
  'provider.sidebar.myPlaces': 'أماكني',
  'provider.sidebar.bookings': 'الحجوزات',
  'provider.sidebar.reviews': 'تقييمات الضيوف',

  // provider create post
  'provider.createPost.title': 'إنشاء منشور',
  'provider.createPost.subtitle': 'شارك التحديثات أو العروض أو الإعلانات مع ضيوفك.',

  // provider business
  'provider.business.loadingTitle': 'جارٍ التحميل...',
  'provider.business.sharePage': 'مشاركة الصفحة',
  'provider.business.linkCopied': 'تم نسخ الرابط إلى الحافظة',
  'provider.business.linkCopyFailed': 'تعذر نسخ الرابط',
  'provider.business.statsLabel': 'إحصائيات النشاط التجاري',
  'provider.business.statPlaces': 'الأماكن',
  'provider.business.statRating': 'متوسط التقييم',
  'provider.business.statBookings': 'الحجوزات',
  'provider.business.tabsAria': 'أقسام صفحة النشاط التجاري',
  'provider.business.tabOverview': 'نظرة عامة',
  'provider.business.tabServices': 'الأماكن',
  'provider.business.tabReviews': 'ملاحظات الضيوف',
  'provider.business.placesTitle': 'الأماكن',
  'provider.business.noPlaces': 'لا توجد أماكن مدرجة بعد.',
  'provider.business.eventsTitle': 'الفعاليات القادمة',
  'provider.business.noEvents': 'لا توجد فعاليات قادمة مجدولة.',
  'provider.business.reviewsTitle': 'ملاحظات الضيوف',
  'provider.business.guestFeedbackTitle': 'ملاحظات الضيوف',
  'provider.business.guestFeedbackSub': 'التقييمات والتعليقات التي تركها الزوار بعد تجربتهم.',
  'provider.business.feedbackStripTitle': 'ملاحظات الضيوف',
  'provider.business.feedbackStripHint': 'افتح القائمة الكاملة للتقييمات والتعليقات',
  'provider.business.feedbackStripEmpty': 'لا توجد تقييمات بعد — تظهر الملاحظات بعد زيارة الضيوف',
  'provider.business.feedbackCountShort': 'تقييم',
  'provider.business.feedbackStripAria': 'ملاحظات الضيوف',
  'provider.business.mapTitle': 'الموقع',
  'provider.business.mapSub': 'منطقة الخدمة على الخريطة',
  'provider.business.placesSub': 'المواقع والقوائم لهذا النشاط التجاري',
  'provider.business.eventsSub': 'التجارب والمواعيد المجدولة',
  'provider.business.reviewsSub': 'ملاحظات من الضيوف',
  'provider.business.postsSub': 'التحديثات المنشورة من هذا النشاط التجاري',
  'provider.business.bookNowComingSoon': 'احجز (قريباً)',

  // provider common
  'provider.common.active': 'نشط',
  'provider.common.inactive': 'غير نشط',
  'provider.common.notSetup': 'حساب مقدم الخدمة الخاص بك غير مُعد. اتصل بالمسؤول.',

  // provider business feed
  'provider.businessFeed.titleFallback': 'النشاط التجاري',
  'provider.businessFeed.atAGlance': 'في لمحة',
  'provider.businessFeed.heroLead': 'إدارة المنشورات والحجوزات والتواجد العام من مكان واحد.',
  'provider.businessFeed.heroSettings': 'إعدادات النشاط التجاري',
  'provider.businessFeed.separationNotice': 'حسابك التجاري منفصل عن ملفك الشخصي. النشاط هنا مخصص لنشاطك التجاري فقط.',
  'provider.businessFeed.feedTitle': 'خلاصة النشاط التجاري',
  'provider.businessFeed.peopleTitle': 'الجمهور والأشخاص',
  'provider.businessFeed.peopleBody': 'صفحتك العامة تظهر المتابعين. المحادثات الشخصية والأصدقاء يبقون في الرسائل ضمن حسابك الشخصي. وصول الفريق لهذا النشاط التجاري (مشابه لأدوار صفحات Facebook) سيكون متاحاً هنا لاحقاً.',
  'provider.businessFeed.viewPublicPage': 'افتح صفحة النشاط التجاري العامة',
  'provider.businessFeed.personalMessages': 'الرسائل الشخصية والأصدقاء',
  'provider.businessFeed.teamComingSoon': 'دعوة أعضاء الفريق للإدارة المشتركة لهذا النشاط التجاري قادمة قريباً.',
  'provider.businessFeed.loadError': 'فشل تحميل خلاصة النشاط التجاري',
  'provider.businessFeed.noPosts': 'لا توجد منشورات في خلاصة نشاطك التجاري بعد.',
  'provider.businessFeed.workspaceEyebrow': 'مساحة عمل النشاط التجاري',
  'provider.businessFeed.trustVerified': 'نشاط تجاري موثق',
  'provider.businessFeed.trustPending': 'التحقق قيد التقدم',
  'provider.businessFeed.trustAttention': 'إجراء مطلوب على حسابك',
  'provider.businessFeed.opsNav': 'العمليات',
  'provider.businessFeed.opsPlaces': 'القوائم',
  'provider.businessFeed.opsBookings': 'الحجوزات',
  'provider.businessFeed.opsReviews': 'تقييمات الضيوف',
  'provider.businessFeed.emptyFeedTitle': 'ابدأ بالتواصل مع الضيوف',
  'provider.businessFeed.noPostsRich': 'المنشورات التي تنشرها كمنشأة تجارية تظهر هنا وعلى صفحتك العامة. شارك التحديثات والصور والعروض في مكان واحد.',
  'provider.businessFeed.ctaCreatePost': 'إنشاء منشور تجاري',
  'provider.businessFeed.ctaAddPlace': 'إدارة القوائم',
  'provider.businessFeed.quickNav': 'اختصارات النشاط التجاري',
  'provider.businessFeed.quickPlaces': 'الأماكن',
  'provider.businessFeed.quickBookings': 'الحجوزات',
  'provider.businessFeed.metricMeta.places': 'الأماكن المرتبطة بنشاطك التجاري',
  'provider.businessFeed.metricMeta.bookings': 'الحجوزات عبر قوائمك',
  'provider.businessFeed.metricMeta.reviews': 'التقييمات من الضيوف',
  'provider.businessFeed.metricMeta.rating': 'المتوسط عبر التقييمات',

  // provider dashboard
  'provider.dashboard.defaultTitle': 'لوحة تحكم مقدم الخدمة',
  'provider.dashboard.metrics.totalPlaces': 'إجمالي الأماكن',
  'provider.dashboard.metrics.totalBookings': 'إجمالي الحجوزات',
  'provider.dashboard.metrics.totalReviews': 'إجمالي التقييمات',
  'provider.dashboard.metrics.averageRating': 'متوسط التقييم',
  'provider.dashboard.actions.managePlaces': 'إدارة الأماكن',
  'provider.dashboard.actions.viewBookings': 'عرض الحجوزات',
  'provider.dashboard.actions.profile': 'ملف مقدم الخدمة',
  'provider.dashboard.feedback.loadError': 'فشل تحميل لوحة تحكم مقدم الخدمة',

  // provider places
  'provider.places.title': 'أماكني',
  'provider.places.empty': 'لم يتم العثور على أماكن لحساب مقدم الخدمة الخاص بك.',
  'provider.places.add': 'إضافة مكان',
  'provider.places.modalCreate': 'إضافة مكان',
  'provider.places.modalEdit': 'تعديل مكان',
  'provider.places.table.city': 'المدينة',
  'provider.places.table.rating': 'التقييم',
  'provider.places.fields.city': 'المدينة',
  'provider.places.fields.active': 'نشط',
  'provider.places.actions.editPlaces': 'تعديل الأماكن',
  'provider.places.feedback.loadError': 'فشل تحميل الأماكن',

  // provider events
  'provider.events.add': 'فعالية جديدة',
  'provider.events.modalCreate': 'إنشاء فعالية',
  'provider.events.modalEdit': 'تعديل فعالية',
  'provider.events.needVenue': 'أنشئ مكاناً أولاً لاستضافة الفعاليات.',
  'provider.events.columns.title': 'العنوان',
  'provider.events.columns.start': 'تبدأ',
  'provider.events.columns.active': 'نشط',
  'provider.events.fields.title': 'العنوان',
  'provider.events.fields.venue': 'المكان (الموقع)',
  'provider.events.fields.start': 'البداية',
  'provider.events.fields.end': 'النهاية',
  'provider.events.fields.tickets': 'التذاكر المتاحة',
  'provider.events.fields.price': 'سعر التذكرة',
  'provider.events.fields.currency': 'العملة',
  'provider.events.fields.active': 'منشور',

  // provider bookings
  'provider.bookings.title': 'حجوزات مقدم الخدمة',
  'provider.bookings.filterAll': 'جميع الحالات',
  'provider.bookings.columns.place': 'المكان',
  'provider.bookings.columns.date': 'تاريخ الحجز',
  'provider.bookings.status.confirmed': 'مؤكد',
  'provider.bookings.status.completed': 'مكتمل',
  'provider.bookings.status.cancelled': 'ملغي',
  'provider.bookings.feedback.loadError': 'فشل تحميل الحجوزات',
  'provider.bookings.feedback.statusError': 'تعذر تحديث حالة الحجز',

  // provider profile
  'provider.profile.title': 'ملف مقدم الخدمة',
  'provider.profile.fields.displayName': 'الاسم المعروض',
  'provider.profile.fields.phone': 'الهاتف',
  'provider.profile.providerTypes.TOUR_PROVIDER': 'مقدم جولات سياحية',
  'provider.profile.providerTypes.EVENT_ORGANIZER': 'منظم فعاليات',
  'provider.profile.providerTypes.ACTIVITY_PROVIDER': 'مقدم أنشطة',
  'provider.profile.actions.save': 'حفظ التغييرات',
  'provider.profile.validation.displayName': 'يرجى إدخال اسم معروض',
  'provider.profile.validation.slug': 'يرجى إدخال معرف مختصر',
  'provider.profile.validation.providerType': 'يرجى اختيار نوع مقدم الخدمة',
});
console.log('Arabic (ar) part 2 complete.');
