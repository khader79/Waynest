type ApiLang = 'en' | 'ar' | 'fr' | 'ru' | 'tr' | 'es' | 'de' | 'zh' | 'pt';

/** Small catalog for HTTP errors when `messageKey` is set on exceptions. */
export const API_ERROR_MESSAGE_CATALOG: Record<
  string,
  Partial<Record<ApiLang, string>>
> = {
  'errors.api.tripPlanNotFound': {
    en: 'Trip plan not found',
    ar: 'لم يتم العثور على خطة الرحلة',
    fr: 'Plan de voyage introuvable',
    ru: 'План поездки не найден',
    tr: 'Seyahat planı bulunamadı',
    es: 'Plan de viaje no encontrado',
    de: 'Reiseplan nicht gefunden',
    zh: '未找到行程计划',
    pt: 'Plano de viagem não encontrado',
  },
  'errors.api.tripPlanForbidden': {
    en: 'Cannot publish another user trip',
    ar: 'لا يمكن نشر رحلة مستخدم آخر',
    fr: 'Impossible de publier le voyage d\'un autre utilisateur',
    ru: 'Нельзя публиковать чужой план поездки',
    tr: 'Başka bir kullanıcının seyahatini yayınlayamazsınız',
    es: 'No puedes publicar el viaje de otro usuario',
    de: 'Sie können die Reise eines anderen Benutzers nicht veröffentlichen',
    zh: '不能发布其他用户的行程',
    pt: 'Não pode publicar a viagem de outro usuário',
  },
  'errors.api.postNotFound': {
    en: 'Post not found',
    ar: 'لم يتم العثور على المنشور',
    fr: 'Publication introuvable',
    ru: 'Запись не найдена',
    tr: 'Gönderi bulunamadı',
    es: 'Publicación no encontrada',
    de: 'Beitrag nicht gefunden',
    zh: '未找到帖子',
    pt: 'Publicação não encontrada',
  },
  'errors.api.postAccessDenied': {
    en: 'Access denied',
    ar: 'الوصول مرفوض',
    fr: 'Accès refusé',
    ru: 'Доступ запрещён',
    tr: 'Erişim reddedildi',
    es: 'Acceso denegado',
    de: 'Zugriff verweigert',
    zh: '访问被拒绝',
    pt: 'Acesso negado',
  },
};
