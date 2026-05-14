const fs = require('fs');
const path = require('path');
const LOCALE_DIR = 'waynest-FE/public/locales';

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
  console.log('Patched ' + Object.keys(patches).length + ' keys for ' + lang);
}

const adminDashboard = {
  // admin dashboard (25)
  'admin.dashboard.totalRevenue': 'Ingresos totales',
  'admin.dashboard.activeSubscriptions': 'Suscripciones activas',
  'admin.dashboard.creditsIssued': 'Créditos emitidos',
  'admin.dashboard.subscriptionPlans': 'Planes de suscripción',
  'admin.dashboard.churnRate': 'Tasa de abandono',
  'admin.dashboard.loading': 'Cargando...',
  'admin.dashboard.retry': 'Reintentar',
  'admin.dashboard.revenueChart': 'Gráfico de ingresos',
  'admin.dashboard.planDistribution': 'Distribución de planes',
  'admin.dashboard.noRevenue': 'Sin ingresos',
  'admin.dashboard.noSubscriptions': 'Sin suscripciones',
  'admin.dashboard.recentPayments': 'Pagos recientes',
  'admin.dashboard.noPayments': 'Sin pagos',
  'admin.dashboard.recentSubscriptions': 'Suscripciones recientes',
  'admin.dashboard.quickActions': 'Acciones rápidas',
  'admin.dashboard.manageUsers': 'Gestionar usuarios',
  'admin.dashboard.managePlaces': 'Gestionar lugares',
  'admin.dashboard.manageProviders': 'Gestionar proveedores',
  'admin.dashboard.billingCredits': 'Facturación/créditos',
  'admin.dashboard.applications': 'Solicitudes',
  'admin.dashboard.verifications': 'Verificaciones',
  'admin.dashboard.user': 'Usuario',
  'admin.dashboard.amount': 'Monto',
  'admin.dashboard.provider': 'Proveedor',
  'admin.dashboard.plan': 'Plan',
  // tripPlanner page (22)
  'tripPlanner.page.heroBadge': 'Planificación con IA',
  'tripPlanner.page.heroTitle': 'Crea un viaje de clase mundial en minutos',
  'tripPlanner.page.heroSubtitle': 'Waynest convierte tu destino, presupuesto y preferencias en una ruta día a día con lugares reales, horarios y eventos.',
  'tripPlanner.page.heroEyebrow': 'Lo que usa la IA',
  'tripPlanner.page.heroBullets.destination': 'Tu ciudad seleccionada, duración y número de viajeros',
  'tripPlanner.page.heroBullets.preferences': 'Tu presupuesto, moneda e intereses de viaje',
  'tripPlanner.page.heroBullets.catalog': 'Catálogo de lugares Waynest, precios y horarios',
  'tripPlanner.page.heroBullets.events': 'Eventos públicos disponibles que encajan en tu viaje',
  'tripPlanner.page.signals.liveDestinationsLabel': 'Destinos en vivo',
  'tripPlanner.page.signals.catalogReady': 'Catálogo listo',
  'tripPlanner.page.signals.preferenceInputsLabel': 'Entradas de preferencias',
  'tripPlanner.page.signals.tailoredRouting': 'Rutas personalizadas',
  'tripPlanner.page.signals.builtForGroupsLabel': 'Diseñado para grupos',
  'tripPlanner.page.signals.builtForGroupsValue': 'De 1 a 20 viajeros',
  'tripPlanner.page.steps.startPlanningTitle': 'Dile a Waynest adónde vas',
  'tripPlanner.page.steps.startPlanningText': 'Elige el país, ciudad y duración para que la IA planifique en torno a un destino real.',
  'tripPlanner.page.steps.tuneTripTitle': 'Ajusta la forma del viaje',
  'tripPlanner.page.steps.tuneTripText': 'Configura el tamaño del grupo, presupuesto, moneda e intereses para que la ruta se ajuste a tu ritmo.',
  'tripPlanner.page.steps.getRouteTitle': 'Obtén una ruta editable con IA',
  'tripPlanner.page.steps.getRouteText': 'Waynest combina tus datos con lugares, precios, horarios y eventos.',
  'tripPlanner.page.deleteModal.title': 'Eliminar plan',
  'tripPlanner.page.deleteModal.message': '¿Estás seguro de eliminar este plan? Esta acción no se puede deshacer.',
  // billing.pricing
  'billing.pricing.unlimited': 'Ilimitado',
  // languages
  'languages.hi': 'Hindi',
  'languages.ur': 'Urdu',
};

const adminDashboardDe = {
  'admin.dashboard.totalRevenue': 'Gesamtumsatz',
  'admin.dashboard.activeSubscriptions': 'Aktive Abonnements',
  'admin.dashboard.creditsIssued': 'Ausgegebenes Guthaben',
  'admin.dashboard.subscriptionPlans': 'Abonnementpläne',
  'admin.dashboard.churnRate': 'Abwanderungsrate',
  'admin.dashboard.loading': 'Lade...',
  'admin.dashboard.retry': 'Wiederholen',
  'admin.dashboard.revenueChart': 'Umsatzdiagramm',
  'admin.dashboard.planDistribution': 'Planverteilung',
  'admin.dashboard.noRevenue': 'Keine Einnahmen',
  'admin.dashboard.noSubscriptions': 'Keine Abonnements',
  'admin.dashboard.recentPayments': 'Letzte Zahlungen',
  'admin.dashboard.noPayments': 'Keine Zahlungen',
  'admin.dashboard.recentSubscriptions': 'Letzte Abonnements',
  'admin.dashboard.quickActions': 'Schnellaktionen',
  'admin.dashboard.manageUsers': 'Benutzer verwalten',
  'admin.dashboard.managePlaces': 'Orte verwalten',
  'admin.dashboard.manageProviders': 'Anbieter verwalten',
  'admin.dashboard.billingCredits': 'Abrechnung/Guthaben',
  'admin.dashboard.applications': 'Anträge',
  'admin.dashboard.verifications': 'Verifizierungen',
  'admin.dashboard.user': 'Benutzer',
  'admin.dashboard.amount': 'Betrag',
  'admin.dashboard.provider': 'Anbieter',
  'admin.dashboard.plan': 'Plan',
  // tripPlanner page (22)
  'tripPlanner.page.heroBadge': 'KI-Planung',
  'tripPlanner.page.heroTitle': 'Erstelle eine erstklassige Reise in Minuten',
  'tripPlanner.page.heroSubtitle': 'Waynest verwandelt dein Ziel, Budget und deine Vorlieben in eine Tag-für-Tag-Route mit echten Orten, Öffnungszeiten und Events.',
  'tripPlanner.page.heroEyebrow': 'Was die KI verwendet',
  'tripPlanner.page.heroBullets.destination': 'Deine ausgewählte Stadt, Dauer und Reisendenanzahl',
  'tripPlanner.page.heroBullets.preferences': 'Dein Budget, Währungspräferenz und Reiseinteressen',
  'tripPlanner.page.heroBullets.catalog': 'Waynest-Ortskatalog, Preise und Öffnungszeiten',
  'tripPlanner.page.heroBullets.events': 'Verfügbare öffentliche Events passend zum Reisezeitraum',
  'tripPlanner.page.signals.liveDestinationsLabel': 'Live-Reiseziele',
  'tripPlanner.page.signals.catalogReady': 'Katalog bereit',
  'tripPlanner.page.signals.preferenceInputsLabel': 'Präferenzeingaben',
  'tripPlanner.page.signals.tailoredRouting': 'Maßgeschneiderte Routen',
  'tripPlanner.page.signals.builtForGroupsLabel': 'Für Gruppen gemacht',
  'tripPlanner.page.signals.builtForGroupsValue': '1 bis 20 Reisende',
  'tripPlanner.page.steps.startPlanningTitle': 'Sag Waynest, wohin du reist',
  'tripPlanner.page.steps.startPlanningText': 'Wähle Land, Stadt und Reisedauer, damit die KI um ein echtes Reiseziel plant.',
  'tripPlanner.page.steps.tuneTripTitle': 'Passe die Reiseform an',
  'tripPlanner.page.steps.tuneTripText': 'Lege Gruppengröße, Budget, Währung und Interessen fest, damit die Route zu deinem Tempo passt.',
  'tripPlanner.page.steps.getRouteTitle': 'Erhalte eine bearbeitbare KI-Route',
  'tripPlanner.page.steps.getRouteText': 'Waynest kombiniert deine Eingaben mit Orten, Preisen, Öffnungszeiten und Events.',
  'tripPlanner.page.deleteModal.title': 'Plan löschen',
  'tripPlanner.page.deleteModal.message': 'Bist du sicher, dass du diesen Plan löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.',
  // billing.pricing
  'billing.pricing.unlimited': 'Unbegrenzt',
  // languages
  'languages.hi': 'Hindi',
  'languages.ur': 'Urdu',
  // explore
  'explore.categories.cafe': 'Café',
  // footer
  'footer.socialFeed': 'Social Feed',
};

const adminDashboardZh = {
  'admin.dashboard.totalRevenue': '总收入',
  'admin.dashboard.activeSubscriptions': '活跃订阅',
  'admin.dashboard.creditsIssued': '已发放积分',
  'admin.dashboard.subscriptionPlans': '订阅套餐',
  'admin.dashboard.churnRate': '流失率',
  'admin.dashboard.loading': '正在加载...',
  'admin.dashboard.retry': '重试',
  'admin.dashboard.revenueChart': '收入图表',
  'admin.dashboard.planDistribution': '套餐分布',
  'admin.dashboard.noRevenue': '暂无收入',
  'admin.dashboard.noSubscriptions': '暂无订阅',
  'admin.dashboard.recentPayments': '最近支付',
  'admin.dashboard.noPayments': '暂无支付',
  'admin.dashboard.recentSubscriptions': '最近订阅',
  'admin.dashboard.quickActions': '快捷操作',
  'admin.dashboard.manageUsers': '管理用户',
  'admin.dashboard.managePlaces': '管理地点',
  'admin.dashboard.manageProviders': '管理提供商',
  'admin.dashboard.billingCredits': '账单/积分',
  'admin.dashboard.applications': '申请',
  'admin.dashboard.verifications': '验证',
  'admin.dashboard.user': '用户',
  'admin.dashboard.amount': '金额',
  'admin.dashboard.provider': '提供商',
  'admin.dashboard.plan': '套餐',
  // tripPlanner page (22)
  'tripPlanner.page.heroBadge': 'AI 优先规划',
  'tripPlanner.page.heroTitle': '几分钟内打造世界级旅程',
  'tripPlanner.page.heroSubtitle': 'Waynest 将你的目的地、预算和偏好转化为逐日路线，包含真实地点、营业时间和活动匹配。',
  'tripPlanner.page.heroEyebrow': 'AI 使用以下信息',
  'tripPlanner.page.heroBullets.destination': '你选择的城市、行程天数和旅行人数',
  'tripPlanner.page.heroBullets.preferences': '你的预算、货币偏好和旅行兴趣',
  'tripPlanner.page.heroBullets.catalog': 'Waynest 地点目录、价格信号和营业时间',
  'tripPlanner.page.heroBullets.events': '适合旅行时间段的可用公开活动',
  'tripPlanner.page.signals.liveDestinationsLabel': '实时目的地',
  'tripPlanner.page.signals.catalogReady': '目录就绪',
  'tripPlanner.page.signals.preferenceInputsLabel': '偏好输入',
  'tripPlanner.page.signals.tailoredRouting': '定制路线',
  'tripPlanner.page.signals.builtForGroupsLabel': '为团队打造',
  'tripPlanner.page.signals.builtForGroupsValue': '1 到 20 位旅行者',
  'tripPlanner.page.steps.startPlanningTitle': '告诉 Waynest 你要去哪里',
  'tripPlanner.page.steps.startPlanningText': '选择国家、城市和行程长度，让 AI 围绕真实目的地进行规划。',
  'tripPlanner.page.steps.tuneTripTitle': '调整行程形态',
  'tripPlanner.page.steps.tuneTripText': '设置团队规模、预算、货币和兴趣，让路线符合你的节奏。',
  'tripPlanner.page.steps.getRouteTitle': '获取可编辑的 AI 路线',
  'tripPlanner.page.steps.getRouteText': 'Waynest 将你的输入与地点、价格、营业时间和匹配活动相结合。',
  'tripPlanner.page.deleteModal.title': '删除计划',
  'tripPlanner.page.deleteModal.message': '确定要删除此计划吗？此操作无法撤销。',
  // billing.pricing
  'billing.pricing.unlimited': '无限',
  // languages
  'languages.hi': '印地语',
  'languages.ur': '乌尔都语',
};

const adminDashboardPt = {
  'admin.dashboard.totalRevenue': 'Receita total',
  'admin.dashboard.activeSubscriptions': 'Assinaturas ativas',
  'admin.dashboard.creditsIssued': 'Créditos emitidos',
  'admin.dashboard.subscriptionPlans': 'Planos de assinatura',
  'admin.dashboard.churnRate': 'Taxa de cancelamento',
  'admin.dashboard.loading': 'Carregando...',
  'admin.dashboard.retry': 'Tentar novamente',
  'admin.dashboard.revenueChart': 'Gráfico de receita',
  'admin.dashboard.planDistribution': 'Distribuição de planos',
  'admin.dashboard.noRevenue': 'Sem receita',
  'admin.dashboard.noSubscriptions': 'Sem assinaturas',
  'admin.dashboard.recentPayments': 'Pagamentos recentes',
  'admin.dashboard.noPayments': 'Sem pagamentos',
  'admin.dashboard.recentSubscriptions': 'Assinaturas recentes',
  'admin.dashboard.quickActions': 'Ações rápidas',
  'admin.dashboard.manageUsers': 'Gerenciar usuários',
  'admin.dashboard.managePlaces': 'Gerenciar lugares',
  'admin.dashboard.manageProviders': 'Gerenciar provedores',
  'admin.dashboard.billingCredits': 'Faturamento/créditos',
  'admin.dashboard.applications': 'Candidaturas',
  'admin.dashboard.verifications': 'Verificações',
  'admin.dashboard.user': 'Usuário',
  'admin.dashboard.amount': 'Valor',
  'admin.dashboard.provider': 'Provedor',
  'admin.dashboard.plan': 'Plano',
  // tripPlanner page (22)
  'tripPlanner.page.heroBadge': 'Planejamento com IA',
  'tripPlanner.page.heroTitle': 'Crie uma viagem de classe mundial em minutos',
  'tripPlanner.page.heroSubtitle': 'Waynest transforma seu destino, orçamento e preferências em uma rota dia a dia com lugares reais, horários e eventos.',
  'tripPlanner.page.heroEyebrow': 'O que a IA usa',
  'tripPlanner.page.heroBullets.destination': 'Sua cidade selecionada, duração e número de viajantes',
  'tripPlanner.page.heroBullets.preferences': 'Seu orçamento, preferência de moeda e interesses de viagem',
  'tripPlanner.page.heroBullets.catalog': 'Catálogo de lugares Waynest, preços e horários',
  'tripPlanner.page.heroBullets.events': 'Eventos públicos disponíveis que se encaixam na janela da viagem',
  'tripPlanner.page.signals.liveDestinationsLabel': 'Destinos ao vivo',
  'tripPlanner.page.signals.catalogReady': 'Catálogo pronto',
  'tripPlanner.page.signals.preferenceInputsLabel': 'Entradas de preferência',
  'tripPlanner.page.signals.tailoredRouting': 'Rotas personalizadas',
  'tripPlanner.page.signals.builtForGroupsLabel': 'Feito para grupos',
  'tripPlanner.page.signals.builtForGroupsValue': '1 a 20 viajantes',
  'tripPlanner.page.steps.startPlanningTitle': 'Diga ao Waynest para onde você vai',
  'tripPlanner.page.steps.startPlanningText': 'Escolha o país, cidade e duração para a IA planejar em torno de um destino real.',
  'tripPlanner.page.steps.tuneTripTitle': 'Ajuste a forma da viagem',
  'tripPlanner.page.steps.tuneTripText': 'Defina tamanho do grupo, orçamento, moeda e interesses para a rota se adequar ao seu ritmo.',
  'tripPlanner.page.steps.getRouteTitle': 'Obtenha uma rota editável com IA',
  'tripPlanner.page.steps.getRouteText': 'Waynest combina seus dados com lugares, preços, horários e eventos.',
  'tripPlanner.page.deleteModal.title': 'Excluir plano',
  'tripPlanner.page.deleteModal.message': 'Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.',
  // billing.pricing
  'billing.pricing.unlimited': 'Ilimitado',
  // languages
  'languages.hi': 'Hindi',
  'languages.ur': 'Urdu',
};

apply('es', adminDashboard);
apply('de', adminDashboardDe);
apply('zh', adminDashboardZh);
apply('pt', adminDashboardPt);
