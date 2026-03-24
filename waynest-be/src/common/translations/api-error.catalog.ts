type ApiLang = 'en' | 'ar' | 'fr' | 'ru' | 'tr';

/** Small catalog for HTTP errors when `messageKey` is set on exceptions. */
export const API_ERROR_MESSAGE_CATALOG: Record<string, Partial<Record<ApiLang, string>>> = {
  'errors.api.tripPlanNotFound': {
    en: 'Trip plan not found',
    ar: 'لم يتم العثور على خطة الرحلة',
    fr: 'Plan de voyage introuvable',
    ru: 'План поездки не найден',
    tr: 'Seyahat planı bulunamadı',
  },
  'errors.api.tripPlanForbidden': {
    en: 'Cannot publish another user trip',
    ar: 'لا يمكن نشر رحلة مستخدم آخر',
    fr: 'Impossible de publier le voyage d’un autre utilisateur',
    ru: 'Нельзя публиковать чужой план поездки',
    tr: 'Başka bir kullanıcının seyahatini yayınlayamazsınız',
  },
  'errors.api.postNotFound': {
    en: 'Post not found',
    ar: 'لم يتم العثور على المنشور',
    fr: 'Publication introuvable',
    ru: 'Запись не найдена',
    tr: 'Gönderi bulunamadı',
  },
  'errors.api.postAccessDenied': {
    en: 'Access denied',
    ar: 'الوصول مرفوض',
    fr: 'Accès refusé',
    ru: 'Доступ запрещён',
    tr: 'Erişim reddedildi',
  },
};
