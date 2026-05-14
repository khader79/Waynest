/**
 * i18n Translation JSON Generator
 * Generates complete translation.json files for es, de, zh, pt
 * Run: node scripts/i18n/generate-translation-jsons.cjs
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.resolve(__dirname, '../../waynest-FE/public/locales');

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function getByPath(obj, p) {
  return p.split('.').reduce((o, k) => o?.[k], obj);
}

// Groups covered by namespace files
const NAMESPACE_GROUPS = {
  common: ['common', 'validation', 'buttons', 'placeholders', 'notifications', 'navigation', 'time', 'dates', 'currency', 'units'],
  errors: ['errors', 'status'],
  tripPlanner: ['tripPlanner']
};

const LANGUAGES = ['es', 'de', 'zh', 'pt'];

const EN_TEMPLATE = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en', 'translation.json'), 'utf-8'));

const NEW_TRANSLATIONS = {
  es: {
    landing: {
      hero: {
        badge: 'Acceso Anticipado',
        title: 'Planifica tu próximo viaje con Waynest',
        description: 'Estamos en acceso anticipado. Sé el primero en crear itinerarios mientras lanzamos, descubre destinos y da forma a la comunidad.',
        btnPlan: 'Planificar mi viaje',
        btnExplore: 'Explorar lugares'
      },
      features: {
        smartPlanning: { title: 'Planificación Inteligente', description: 'Crea itinerarios con pasos claros y un flujo guiado desde el primer día.' },
        discoverPlaces: { title: 'Descubrir Lugares', description: 'Selecciona alojamientos y experiencias mientras crecemos la plataforma juntos.' },
        communityReviews: { title: 'Opiniones de la Comunidad', description: 'Las reseñas se abren después del lanzamiento. Serás una de las primeras voces.' },
        saveShare: { title: 'Guardar y Compartir', description: 'Mantén tus viajes organizados y compártelos con amigos en segundos.' }
      },
      stats: {
        tripsCreated: { value: '0', label: 'Viajes Creados', subLabel: 'Beta: Aún no hay viajes públicos' },
        activeTravelers: { value: '0', label: 'Viajeros Activos', subLabel: 'Sé el primero en unirte' },
        communityReviews: { value: '0', label: 'Opiniones de la Comunidad', subLabel: 'Reseñas abiertas después del lanzamiento' }
      }
    },
    landingPage: {
      hero: {
        badge: 'Sistema de viajes IA con datos reales del catálogo',
        title: 'El planificador de viajes que se siente inteligente, claro e instantáneamente útil.',
        description: 'Waynest convierte destino, presupuesto, viajeros, intereses, lugares, horarios y eventos públicos en una ruta editable que tiene sentido desde la primera pantalla.',
        btnPlan: 'Iniciar el planificador IA', btnExplore: 'Explorar lugares en vivo', btnCreateAccount: 'Crear cuenta',
        micro: { fastFlow: 'Flujo rápido para invitados sin barreras de configuración', explained: 'Lógica de ruta IA explicada, no oculta', planning: 'Diseñado para planificar, compartir y remezclar' }
      },
      visual: {
        analysisKicker: 'Motor de rutas IA', analysisTitle: 'Lo que Waynest realmente analiza',
        analysisItem1: 'Destino, ciudad y duración del viaje', analysisItem2: 'Tamaño del grupo, presupuesto y moneda seleccionada',
        analysisItem3: 'Etiquetas de interés, lugares, precios y horarios', analysisItem4: 'Eventos coincidentes y estructura de ruta compartible',
        outputKicker: 'Ejemplo de resultado', outputTitle: 'Vista previa de ruta día a día',
        dayLabel: 'Día 1', morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche',
        morningTitle: 'Lugar emblemático + parada para desayunar', afternoonTitle: 'Actividad con presupuesto y horarios reales',
        eveningTitle: 'Evento coincidente o recomendación gastronómica local'
      },
      stats: { aria: 'Estadísticas de la plataforma Waynest', activeTravelers: 'Viajeros activos', livePlaces: 'Lugares en vivo', countries: 'Países', sharedRoutes: 'Rutas compartidas' },
      standout: { eyebrow: 'Por qué destaca', title: 'Construido para sentirse diferente a las herramientas genéricas de viajes', description: 'El valor es claro de un vistazo: planificación IA, datos de destinos en vivo y una capa social que hace reutilizables las rutas.' },
      differentiators: {
        realInputs: { title: 'IA que planifica con datos reales', description: 'Waynest construye rutas a partir de tu destino, tamaño del grupo, presupuesto, intereses, precios de lugares y horarios.' },
        firstClick: { title: 'Utilizable desde el primer clic', description: 'Los invitados pueden explorar, generar un viaje y entender el flujo inmediatamente sin configuración compleja.' },
        socialTravel: { title: 'Viajar como experiencia social', description: 'Convierte la planificación privada en rutas compartibles que otros viajeros pueden ver, copiar y remezclar.' }
      },
      planner: {
        eyebrow: 'Flujo del planificador', title: 'Suficientemente simple para que cualquiera lo use', link: 'Abrir el planificador',
        setDestination: { title: 'Define el destino', description: 'Elige el país, la ciudad, la duración del viaje y el número de viajeros.' },
        giveContext: { title: 'Dale contexto a la IA', description: 'Añade presupuesto, moneda e intereses para que la ruta se ajuste a tu estilo.' },
        reviewRoute: { title: 'Revisa una ruta real', description: 'Obtén un itinerario día a día respaldado por lugares, costos, horarios y eventos.' }
      },
      featured: { eyebrow: 'Lugares destacados', title: 'Destinos reales que los usuarios pueden explorar ahora mismo', link: 'Explorar todos los lugares', loading: 'Cargando destinos destacados...', empty: 'Aún no hay lugares destacados disponibles.', fallbackDescription: 'Explora un destino que se puede incorporar directamente a tu próxima ruta IA.' },
      events: { eyebrow: 'Próximos eventos', title: 'Momentos que el planificador puede integrar en una ruta', loading: 'Cargando eventos...', empty: 'No hay próximos eventos disponibles.' },
      shared: { eyebrow: 'Viajes compartidos', title: 'Prueba de que las rutas de Waynest pueden vivir más allá de un usuario', loading: 'Cargando rutas compartidas...', empty: 'Aún no hay rutas públicas disponibles.', sharedTravelerRoute: 'Ruta de viajero compartida', publishedBy: 'Publicado por @{{username}}', publishedTravelRoute: 'Ruta de viaje publicada' },
      cta: { eyebrow: '¿Listo para comenzar?', title: 'Comienza con el planificador IA, luego crece hacia la experiencia completa de Waynest.', description: 'Genera una ruta como invitado, inicia sesión para guardarla y sigue construyendo en un sistema que combina usabilidad, descubrimiento y viajes sociales.', primary: 'Probar el planificador', secondary: 'Crear cuenta', ghost: 'Iniciar sesión' },
      openDetails: 'Abrir detalles'
    },
    login: {
      welcomeBack: 'Bienvenido de nuevo', signIn: 'Inicia sesión en tu cuenta',
      emailOrUsername: 'Correo o nombre de usuario', enterEmailOrUsername: 'Ingresa tu correo o nombre de usuario',
      password: 'Contraseña', enterPassword: 'Ingresa tu contraseña', loginButton: 'Iniciar sesión',
      loggingIn: 'Iniciando sesión...', loginFailed: 'Inicio de sesión fallido. Intenta de nuevo.',
      showPassword: 'Mostrar contraseña', hidePassword: 'Ocultar contraseña',
      chooseAccountTitle: '¿Cómo quieres continuar?', chooseAccountSubtitle: 'Usa Waynest como viajero o abre tus herramientas de negocio.',
      choosePersonal: 'Cuenta personal', choosePersonalHint: 'Feed principal, viajes, reservas y perfil como viajero.',
      chooseProvider: 'Panel de proveedor', chooseProviderHint: 'Gestiona tu negocio, listados y reservas de proveedor.'
    },
    contact: {
      hero: { title: 'Ponte en Contacto', subtitle: '¿Tienes una pregunta o comentario? ¡Nos encantaría saber de ti!' },
      contactInformation: { title: 'Información de Contacto', email: 'Correo electrónico', emailValue: 'support@waynest.com', responseTime: 'Tiempo de respuesta', responseTimeValue: 'Dentro de 24 horas', officeHours: 'Horario de oficina', officeHoursValue: 'Lunes - Viernes: 9:00 AM - 6:00 PM' },
      followUs: { title: 'Síguenos', twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' },
      form: {
        title: 'Envíanos un Mensaje', name: 'Nombre', namePlaceholder: 'Tu nombre',
        email: 'Correo', emailPlaceholder: 'tu.correo@ejemplo.com', subject: 'Asunto', subjectPlaceholder: 'Selecciona un asunto',
        subjectOptions: { general: 'Consulta General', support: 'Soporte Técnico', feedback: 'Comentarios', partnership: 'Asociación', other: 'Otro' },
        message: 'Mensaje', messagePlaceholder: 'Cuéntanos cómo podemos ayudarte...', sendButton: 'Enviar Mensaje', sending: 'Enviando...', required: '*'
      },
      success: { title: '¡Gracias por contactarnos!', message: 'Hemos recibido tu mensaje y te responderemos pronto.', sendAnother: 'Enviar Otro Mensaje' }
    },
    about: {
      hero: { title: 'Acerca de Waynest', subtitle: 'Tu compañero de confianza para descubrir destinos increíbles alrededor del mundo' },
      mission: { title: 'Nuestra Misión', description: 'En Waynest creemos que viajar debe ser accesible, inspirador e inolvidable. Nuestra misión es conectar a los viajeros con los destinos más hermosos del mundo, ayudándoles a descubrir joyas ocultas y crear recuerdos duraderos.' },
      whatWeOffer: {
        title: 'Qué Ofrecemos',
        discoverPlaces: { title: 'Descubrir Lugares', description: 'Explora miles de destinos, desde bulliciosas ciudades hasta maravillas naturales. Encuentra el lugar perfecto para tu próxima aventura.' },
        expertReviews: { title: 'Reseñas de Expertos', description: 'Lee reseñas auténticas de otros viajeros y obtén consejos internos sobre los mejores lugares para visitar, comer y alojarte.' },
        planYourTrip: { title: 'Planifica tu Viaje', description: 'Guarda tus destinos favoritos, crea listas de deseos y planifica tu itinerario perfecto todo en un solo lugar.' },
        communityDriven: { title: 'Impulsado por la Comunidad', description: 'Únete a una comunidad de viajeros apasionados que comparten sus experiencias y recomendaciones para ayudar a otros a explorar el mundo.' }
      },
      whyChoose: {
        title: '¿Por qué elegir Waynest?',
        comprehensiveDatabase: 'Base de datos completa:', comprehensiveDatabaseDesc: 'Accede a información de países, ciudades y lugares de todo el mundo.',
        realExperiences: 'Experiencias reales:', realExperiencesDesc: 'Obtén información de viajeros reales que han estado allí.',
        easyPlanning: 'Planificación fácil:', easyPlanningDesc: 'Organiza tus planes de viaje con nuestras herramientas y funciones intuitivas.',
        alwaysUpdated: 'Siempre actualizado:', alwaysUpdatedDesc: 'Nuestra plataforma se actualiza constantemente con nuevos destinos y contenido fresco.'
      },
      ourStory: { title: 'Nuestra Historia', paragraph1: 'Waynest nació de una idea simple: hacer la planificación de viajes más fácil y agradable. Entendemos que planificar un viaje puede ser abrumador, con tantas opciones y decisiones que tomar. Por eso creamos una plataforma que reúne todo lo que necesitas en un solo lugar.', paragraph2: 'Ya seas un viajero experimentado o estés planeando tu primera aventura, Waynest está aquí para ayudarte a descubrir, planificar y experimentar el mundo de una manera completamente nueva.' },
      joinCommunity: { title: 'Únete a Nuestra Comunidad', description: '¿Listo para comenzar tu próxima aventura? Únete a miles de viajeros que confían en Waynest para ayudarles a descubrir destinos increíbles y crear recuerdos inolvidables.', getStarted: 'Comenzar', exploreDestinations: 'Explorar Destinos' }
    },
    destinations: {
      hero: { eyebrow: 'Explora el Mundo', title: 'Descubre Destinos', subtitle: 'Explora increíbles países y ciudades alrededor del mundo', searchPlaceholder: 'Buscar destinos, ciudades o capitales...' },
      regions: { all: 'Todos', asia: 'Asia', europe: 'Europa', africa: 'África', americas: 'Américas', oceania: 'Oceanía' },
      labels: { capital: 'Capital:', region: 'Región:', cities: 'Ciudades:', more: 'más' },
      filtersNav: 'Filtrar por región', flagAlt: 'Bandera de {{country}}', loading: 'Cargando destinos...',
      emptyState: 'No se encontraron destinos. Intenta ajustar tu búsqueda o filtros.'
    },
    register: {
      title: 'Crear Cuenta', subtitle: 'Regístrate para comenzar',
      firstName: 'Nombre', firstNamePlaceholder: 'Ingresa tu nombre', lastName: 'Apellido', lastNamePlaceholder: 'Ingresa tu apellido',
      email: 'Correo electrónico', emailPlaceholder: 'Ingresa tu correo', username: 'Nombre de usuario', usernamePlaceholder: 'Elige un nombre de usuario',
      password: 'Contraseña', passwordPlaceholder: 'Ingresa tu contraseña (mín. 8 caracteres)',
      confirmPassword: 'Confirmar Contraseña', confirmPasswordPlaceholder: 'Confirma tu contraseña',
      signUp: 'Registrarse', creatingAccount: 'Creando Cuenta...', alreadyHaveAccount: '¿Ya tienes una cuenta?', signIn: 'Inicia sesión',
      passwordsDoNotMatch: 'Las contraseñas no coinciden', passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
      registrationFailed: 'Registro fallido. Intenta de nuevo.', showPassword: 'Mostrar contraseña', hidePassword: 'Ocultar contraseña'
    },
    explore: {
      hero: { title: 'Explorar Lugares', subtitle: 'Descubre destinos increíbles alrededor del mundo', searchPlaceholder: 'Buscar lugares...', googleUnavailable: 'La búsqueda de Google Places no está disponible en este entorno.', description: 'Esta página se centra en el descubrimiento. Navega por el catálogo, busca proveedores públicos y abre detalles sin el desorden social.' },
      categories: { all: 'Todos', restaurant: 'Restaurante', cafe: 'Cafetería', attraction: 'Atracción', museum: 'Museo', park: 'Parque', historical: 'Histórico', events: 'Eventos' },
      search: { title: 'Buscar en el catálogo público', placeholder: 'Buscar proveedores, lugares y eventos...', loading: 'Buscando...' },
      events: { title: 'Eventos', emptyMessage: 'No hay eventos próximos ahora. Vuelve más tarde.' },
      emptyState: 'No se encontraron lugares'
    },
    navbar: {
      home: 'Inicio', explore: 'Explorar', search: 'Buscar', planner: 'Planificador', social: 'Social',
      inbox: 'Bandeja de entrada', notifications: 'Notificaciones', notificationsMenu: 'Notificaciones', notificationsSeeAll: 'Ver todas las notificaciones',
      about: 'Acerca de', contact: 'Contacto', login: 'Iniciar sesión', signUp: 'Registrarse',
      userPanel: 'Panel de Usuario', adminPanel: 'Panel de Administración', providerPanel: 'Cuenta de negocio',
      businessAccount: 'Cuenta de negocio', logout: 'Cerrar sesión', welcome: 'Bienvenido',
      dark: 'Oscuro', light: 'Claro', language: 'Idioma',
      toggleSidebar: 'Abrir barra lateral', closeSidebar: 'Cerrar barra lateral',
      providerProfileSection: 'Perfil de proveedor', backToFeed: 'Volver al feed', personalAccount: 'Cuenta personal'
    },
    user: {
      sidebar: { dashboard: 'Panel', profile: 'Perfil', bookings: 'Reservas', wishlist: 'Lista de deseos' },
      dashboard: { title: 'Panel', myBookings: 'Mis Reservas', wishlist: 'Lista de Deseos', myReviews: 'Mis Reseñas', profileStatus: 'Estado del Perfil', active: 'Activo' },
      wishlist: { title: 'Lista de Deseos', empty: 'Tu lista de deseos está vacía', emptyAction: '¡Empieza a explorar!', exploreButton: 'Explorar Lugares', remove: 'Eliminar', rating: 'Puntuación' },
      bookings: {
        title: 'Mis Reservas', empty: 'Aún no hay reservas', emptyAction: '¡Explora lugares para reservar tu visita!', exploreButton: 'Explorar Lugares',
        persons: 'personas', cancel: 'Cancelar',
        status: { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' }
      },
      profile: {
        connectionsBack: 'Volver', connectionsBackUser: 'Volver', title: 'Tu Perfil', subtitle: 'Mantén tus datos personales actualizados.',
        name: 'Nombre', email: 'Correo', phone: 'Teléfono', saveChanges: 'Guardar Cambios', accountCenter: 'Centro de Cuenta'
      },
      tripPlanner: { title: 'Planificador de Viajes IA', planYourTrip: 'Planifica tu Viaje Perfecto' }
    },
    provider: {
      sidebar: {
        feed: 'Feed', dashboard: 'Panel', profile: 'Perfil', createPost: 'Crear publicación',
        sectionOverview: 'Resumen', sectionOperations: 'Operaciones', sectionPresence: 'Presencia', sectionAccount: 'Cuenta',
        publicPage: 'Página pública', businessSettings: 'Configuración de negocio', myPlaces: 'Mis Lugares',
        events: 'Eventos', bookings: 'Reservas', reviews: 'Reseñas de huéspedes'
      },
      createPost: { title: 'Crear publicación', subtitle: 'Comparte actualizaciones, ofertas o anuncios con tus huéspedes.' },
      business: {
        loadingTitle: 'Cargando\u2026', sharePage: 'Compartir página', linkCopied: 'Enlace copiado al portapapeles', linkCopyFailed: 'No se pudo copiar el enlace',
        statsLabel: 'Estadísticas del negocio', statPlaces: 'Lugares', statRating: 'Puntuación media', statReviews: 'Comentarios', statBookings: 'Reservas',
        tabsAria: 'Secciones de la página de negocio', tabOverview: 'Resumen', tabServices: 'Lugares', tabEvents: 'Eventos', tabReviews: 'Comentarios de huéspedes',
        placesTitle: 'Lugares', noPlaces: 'Aún no hay lugares listados.', eventsTitle: 'Próximos eventos', noEvents: 'No hay próximos eventos programados.',
        reviewsTitle: 'Comentarios de huéspedes', guestFeedbackTitle: 'Comentarios de huéspedes', guestFeedbackSub: 'Valoraciones y comentarios dejados por los visitantes después de su experiencia.',
        feedbackStripTitle: 'Comentarios de huéspedes', feedbackStripHint: 'Abrir la lista completa de valoraciones y comentarios',
        feedbackStripEmpty: 'Aún no hay valoraciones \u2014 aparecen después de la visita', feedbackCountShort: 'reseñas', feedbackStripAria: 'Comentarios de huéspedes',
        mapTitle: 'Ubicación', mapSub: 'Área de servicio en el mapa', placesSub: 'Lugares y listados de este negocio',
        eventsSub: 'Experiencias y fechas programadas', reviewsSub: 'Comentarios de huéspedes', postsSub: 'Actualizaciones publicadas por este negocio',
        viewMap: 'Mapa', bookNow: 'Reservar', bookNowComingSoon: 'Reservar (Próximamente)'
      },
      common: { active: 'Activo', inactive: 'Inactivo', notSetup: 'Tu cuenta de proveedor no está configurada. Contacta a un administrador.' },
      businessFeed: {
        titleFallback: 'Negocio', atAGlance: 'De un vistazo', heroLead: 'Gestiona publicaciones, reservas y tu presencia pública desde un solo lugar.',
        heroSettings: 'Configuración de negocio', separationNotice: 'Tu cuenta de negocio está separada de tu perfil personal. La actividad aquí es solo para tu negocio.',
        feedTitle: 'Feed de negocio', peopleTitle: 'Audiencia y personas',
        peopleBody: 'Tu página pública muestra seguidores. Los chats personales y amigos permanecen en Mensajes bajo tu cuenta personal. El acceso de equipo para este negocio estará disponible aquí más adelante.',
        viewPublicPage: 'Abrir página pública de negocio', personalMessages: 'Mensajes y amigos personales', teamComingSoon: 'Invitar compañeros a co-gestionar este negocio estará disponible pronto.',
        loadError: 'Error al cargar el feed del negocio', noPosts: 'Aún no hay publicaciones en tu feed de negocio.',
        workspaceEyebrow: 'Espacio de trabajo de negocio', trustVerified: 'Negocio verificado', trustPending: 'Verificación en progreso', trustAttention: 'Acción requerida en tu cuenta',
        opsNav: 'Operaciones', opsPlaces: 'Listados', opsEvents: 'Eventos', opsBookings: 'Reservas', opsReviews: 'Reseñas de huéspedes',
        emptyFeedTitle: 'Comienza a llegar a huéspedes',
        noPostsRich: 'Las publicaciones que hagas como este negocio aparecen aquí y en tu página pública. Comparte actualizaciones, fotos y ofertas en un solo lugar.',
        ctaCreatePost: 'Crear publicación de negocio', ctaAddPlace: 'Gestionar listados',
        quickNav: 'Atajos del negocio', quickPlaces: 'Lugares', quickBookings: 'Reservas', quickSettings: 'Configuración',
        metricMeta: { places: 'Lugares vinculados a tu negocio', bookings: 'Reservas en todos tus listados', reviews: 'Reseñas de huéspedes', rating: 'Media de todas las reseñas' }
      },
      dashboard: {
        defaultTitle: 'Panel del Proveedor',
        metrics: { totalPlaces: 'Total de Lugares', totalBookings: 'Total de Reservas', totalReviews: 'Total de Reseñas', averageRating: 'Puntuación Media' },
        actions: { managePlaces: 'Gestionar Lugares', viewBookings: 'Ver Reservas', profile: 'Perfil del Proveedor' },
        feedback: { loadError: 'Error al cargar el panel del proveedor' }
      },
      places: {
        title: 'Mis Lugares', empty: 'No se encontraron lugares para tu cuenta de proveedor.', add: 'Añadir lugar', edit: 'Editar', save: 'Guardar',
        modalCreate: 'Añadir lugar', modalEdit: 'Editar lugar', typeAndRating: '{{type}} \u00b7 {{rating}} \u2605',
        table: { image: '', name: 'Nombre', type: 'Tipo', city: 'Ciudad', rating: 'Puntuación', active: 'Estado', actions: 'Acciones' },
        fields: { name: 'Nombre', description: 'Descripción', type: 'Tipo', city: 'Ciudad', latitude: 'Latitud', longitude: 'Longitud', slug: 'Slug (opcional)', active: 'Activo' },
        actions: { editPlaces: 'Editar Lugares', editPlace: 'Editar' },
        feedback: { loadError: 'Error al cargar lugares' }
      },
      events: {
        title: 'Eventos', add: 'Nuevo evento', edit: 'Editar', save: 'Guardar', modalCreate: 'Crear evento', modalEdit: 'Editar evento',
        needVenue: 'Crea un lugar primero para albergar eventos.',
        columns: { title: 'Título', venue: 'Lugar', start: 'Inicio', price: 'Precio', active: 'Activo', actions: 'Acciones' },
        fields: { title: 'Título', description: 'Descripción', venue: 'Lugar', start: 'Inicio', end: 'Fin', tickets: 'Entradas disponibles', price: 'Precio de la entrada', currency: 'Moneda', active: 'Publicado' }
      },
      bookings: {
        title: 'Reservas del Proveedor', filterAll: 'Todos los estados',
        columns: { place: 'Lugar', date: 'Fecha de reserva', persons: 'Huéspedes', total: 'Total', status: 'Estado' },
        status: { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' },
        feedback: { loadError: 'Error al cargar reservas', statusError: 'No se pudo actualizar el estado de la reserva' }
      },
      profile: {
        title: 'Perfil del Proveedor',
        fields: { displayName: 'Nombre para mostrar', slug: 'Slug', providerType: 'Tipo de Proveedor', phone: 'Teléfono', website: 'Sitio web' },
        providerTypes: { HOTEL: 'Hotel', RESTAURANT: 'Restaurante', TOUR_PROVIDER: 'Proveedor de Tours', EVENT_ORGANIZER: 'Organizador de Eventos', ACTIVITY_PROVIDER: 'Proveedor de Actividades' },
        actions: { save: 'Guardar Cambios' },
        validation: { displayName: 'Por favor ingresa un nombre para mostrar', slug: 'Por favor ingresa un slug', providerType: 'Por favor selecciona un tipo de proveedor', phone: 'Por favor ingresa un número de teléfono' },
        feedback: { loadError: 'Error al cargar el perfil', updateSuccess: 'Perfil actualizado exitosamente', updateError: 'Error al actualizar el perfil' }
      },
      apply: {
        steps: { business: 'Negocio', contact: 'Contacto', review: 'Revisión' },
        stepBusinessTitle: 'Detalles del negocio', stepContactTitle: 'Contacto y tipo', stepReviewTitle: 'Revisar y enviar',
        highlights: {
          businessBasics: { title: 'Todos los datos del negocio', text: 'Nombre, descripción, ubicación, datos fiscales y categorías en un flujo limpio.' },
          deviceImages: { title: 'Imágenes desde tu dispositivo', text: 'Sube tu logo y foto de portada directamente, con vista previa instantánea.' },
          ownerFirst: { title: 'Acceso prioritario del propietario', text: 'Tu cuenta se convierte en la propietaria del negocio y puede añadir miembros del equipo después.' }
        },
        next: 'Siguiente', back: 'Atrás', successTitle: 'Solicitud recibida', successBody: 'Gracias. Tu solicitud está pendiente de revisión. Te notificaremos cuando se tome una decisión.', goHome: 'Volver al inicio'
      }
    },
    admin: {
      dashboard: { title: 'Panel de Administración', totalUsers: 'Total de Usuarios', totalProviders: 'Total de Proveedores', totalPlaces: 'Total de Lugares', totalReviews: 'Total de Reseñas', failedToLoadStats: 'Error al cargar estadísticas' },
      common: {
        actions: 'Acciones', edit: 'Editar', delete: 'Eliminar', add: 'Añadir', save: 'Guardar', cancel: 'Cancelar', loading: 'Cargando...',
        totalItems: 'Total', items: 'elementos', pleaseInput: 'Por favor ingresa', failedToSubmit: 'Error al enviar el formulario',
        confirmDelete: 'Confirmar Eliminación', deleteConfirmMessage: '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
        deleteButton: 'Eliminar', createdSuccessfully: 'creado exitosamente', updatedSuccessfully: 'actualizado exitosamente', deletedSuccessfully: 'eliminado exitosamente',
        entityCreatedSuccessfully: '{{entity}} creado exitosamente', entityUpdatedSuccessfully: '{{entity}} actualizado exitosamente', entityDeletedSuccessfully: '{{entity}} eliminado exitosamente',
        failedToLoad: 'Error al cargar', failedToSave: 'Error al guardar', failedToDelete: 'Error al eliminar', yes: 'Sí', no: 'No'
      },
      sidebar: {
        dashboard: 'Panel', users: 'Usuarios', providers: 'Proveedores', places: 'Lugares', countries: 'Países', cities: 'Ciudades',
        currencies: 'Monedas', tags: 'Etiquetas', events: 'Eventos', reviews: 'Reseñas', placePricing: 'Precios de Lugares',
        openingHours: 'Horarios de Apertura', providerMembership: 'Membresía de Proveedores', devices: 'Dispositivos'
      },
      users: { title: 'Gestión de Usuarios', addUser: 'Añadir Usuario', editUser: 'Editar Usuario', deleteUser: 'Eliminar Usuario', deleteConfirm: '¿Estás seguro de que quieres eliminar al usuario', firstName: 'Nombre', lastName: 'Apellido', email: 'Correo', username: 'Nombre de usuario', password: 'Contraseña', role: 'Rol', phone: 'Teléfono', status: 'Estado', createdAt: 'Creado el' },
      providers: { title: 'Gestión de Proveedores', addProvider: 'Añadir Proveedor', editProvider: 'Editar Proveedor', deleteProvider: 'Eliminar Proveedor', deleteConfirm: '¿Estás seguro de que quieres eliminar al proveedor', displayName: 'Nombre para mostrar', providerType: 'Tipo de Proveedor', website: 'Sitio web', verificationStatus: 'Estado de Verificación' },
      places: { title: 'Gestión de Lugares', addPlace: 'Añadir Lugar', editPlace: 'Editar Lugar', deletePlace: 'Eliminar Lugar', deleteConfirm: '¿Estás seguro de que quieres eliminar el lugar', name: 'Nombre', slug: 'Slug', description: 'Descripción', type: 'Tipo', city: 'Ciudad', latitude: 'Latitud', longitude: 'Longitud', ratingAverage: 'Puntuación Media', ratingCount: 'Cantidad de Valoraciones', isActive: 'Activo', isVerified: 'Verificado' },
      countries: { title: 'Gestión de Países', addCountry: 'Añadir País', editCountry: 'Editar País', deleteCountry: 'Eliminar País', deleteConfirm: '¿Estás seguro de que quieres eliminar el país', nativeName: 'Nombre Nativo', alpha2: 'Alfa 2', alpha3: 'Alfa 3', numeric: 'Código Numérico' },
      cities: { title: 'Gestión de Ciudades', addCity: 'Añadir Ciudad', editCity: 'Editar Ciudad', deleteCity: 'Eliminar Ciudad', deleteConfirm: '¿Estás seguro de que quieres eliminar la ciudad', stateName: 'Nombre del Estado', population: 'Población' },
      currencies: { title: 'Gestión de Monedas', addCurrency: 'Añadir Moneda', editCurrency: 'Editar Moneda', deleteCurrency: 'Eliminar Moneda', deleteConfirm: '¿Estás seguro de que quieres eliminar la moneda', code: 'Código', fractionSize: 'Tamaño de Fracción' },
      tags: { title: 'Gestión de Etiquetas', addTag: 'Añadir Etiqueta', editTag: 'Editar Etiqueta', deleteTag: 'Eliminar Etiqueta', deleteConfirm: '¿Estás seguro de que quieres eliminar la etiqueta' },
      events: { title: 'Gestión de Eventos', addEvent: 'Añadir Evento', editEvent: 'Editar Evento', deleteEvent: 'Eliminar Evento', deleteConfirm: '¿Estás seguro de que quieres eliminar el evento', titleField: 'Título', venue: 'Lugar', startDate: 'Fecha de Inicio', endDate: 'Fecha de Fin', availableTickets: 'Entradas Disponibles', ticketPrice: 'Precio de la Entrada', currencyCode: 'Código de Moneda' },
      reviews: { title: 'Gestión de Reseñas', addReview: 'Añadir Reseña', editReview: 'Editar Reseña', deleteReview: 'Eliminar Reseña', deleteConfirm: '¿Estás seguro de que quieres eliminar la reseña' },
      placePricing: { title: 'Gestión de Precios de Lugares', addPlacePricing: 'Añadir Precio de Lugar', editPlacePricing: 'Editar Precio de Lugar', deletePlacePricing: 'Eliminar Precio de Lugar', deleteConfirm: '¿Estás seguro de que quieres eliminar el precio de lugar' },
      placeOpeningHours: {
        title: 'Gestión de Horarios de Apertura', addPlaceOpeningHours: 'Añadir Horario', editPlaceOpeningHours: 'Editar Horario', deletePlaceOpeningHours: 'Eliminar Horario',
        deleteConfirm: '¿Estás seguro de que quieres eliminar este horario', dayOfWeek: 'Día de la Semana', openTime: 'Hora de Apertura', closeTime: 'Hora de Cierre',
        days: { sunday: 'Domingo', monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado' }
      },
      providerMembership: { title: 'Gestión de Membresías de Proveedores', addProviderMembership: 'Añadir Membresía', editProviderMembership: 'Editar Membresía', deleteProviderMembership: 'Eliminar Membresía', deleteConfirm: '¿Estás seguro de que quieres eliminar esta membresía', providerRole: 'Rol del Proveedor' }
    },
    languages: { en: 'Inglés', ar: 'Árabe', ru: 'Ruso', fr: 'Francés', tr: 'Turco', es: 'Español', de: 'Alemán', zh: 'Chino', pt: 'Portugués' },
    search: {
      label: 'Buscar', placeholder: 'Personas, lugares, negocios\u2026', placeholderGuest: 'Proveedores, lugares, eventos\u2026',
      submit: 'Ir', failed: 'Búsqueda fallida', resultsFor: 'Resultados para \u201c{{q}}\u201d',
      emptyTitle: 'Buscar', useBar: 'Usa el cuadro de búsqueda en esta página.',
      typeToSearch: 'Escribe arriba para buscar personas, proveedores, lugares y eventos.',
      noResults: 'Aún no hay coincidencias.', planFromHere: 'Planificar desde aquí',
      planNeedsCity: 'Elige un lugar con una ciudad para planificar desde aquí.',
      publicTripsTitle: 'Viajes públicos de viajeros', publicTripsEmpty: 'Aún no hay viajes públicos. Comparte un plan para verlo aquí.',
      publicTripsLoadFailed: 'No se pudieron cargar los viajes públicos.', publicTripsBy: 'Por @{{username}}'
    },
    friends: { connected: 'Amigos', requestSent: 'Solicitud enviada', accept: 'Aceptar', decline: 'Rechazar', add: 'Añadir amigo' },
    social: {
      profile: 'Mis Publicaciones', settings: 'Configuración', follow: 'Seguir', unfollow: 'Dejar de seguir',
      feed: {
        title: 'Feed de la Comunidad', openSearch: 'Buscar', loading: 'Cargando feed...', empty: 'Aún no hay publicaciones en este feed.',
        traveler: 'Viajero', openSharedTrip: 'Abrir viaje compartido', loadFailed: 'Error al cargar el feed social', savedPlansLoadFailed: 'Error al cargar planes guardados',
        loginToPublish: 'Inicia sesión para publicar', selectPlanFirst: 'Selecciona un plan guardado', published: 'Publicación publicada',
        publishedToast: '¡Publicado!', publishFailed: 'Error al publicar', loginFirst: 'Inicia sesión primero', likeUpdated: 'Me gusta actualizado',
        savedToAccount: 'Guardado en tu cuenta', shareCopied: 'Enlace del viaje copiado', shareUnavailable: 'Esta publicación aún no tiene un viaje compartible',
        actions: { like: 'Me gusta', saveCopy: 'Guardar y Copiar', comments: 'Comentarios', share: 'Compartir' },
        filters: { forYou: 'Para Ti', following: 'Siguiendo', providers: 'Proveedores' },
        composer: {
          eyebrow: 'Publicar en Waynest', title: 'Comparte tu viaje',
          helper: 'Escribe una nota, añade fotos o un lugar, o adjunta un plan guardado \u2014 publica lo que te importa.',
          postTitle: 'Título', postTitlePlaceholder: 'Título de la publicación (opcional)', bodyLabel: '¿Qué tienes en mente?',
          bodyPlaceholder: 'Escribe algo sobre tu viaje, un consejo o un momento\u2026',
          imagesSection: 'Fotos', imagesHint: 'PNG o JPG, hasta 6 imágenes \u00b7 5MB cada una',
          dropzone: 'Suelta las imágenes aquí o haz clic para buscar', removeImage: 'Eliminar', uploading: 'Subiendo\u2026',
          placeSection: 'Lugar', placeHint: 'Opcional \u2014 ciudad, punto de referencia o dirección mostrada en la publicación',
          placeHintDb: 'Busca lugares de Waynest o usa tu ubicación para elegir el listado más cercano.',
          placeSearchFailed: 'No se pudieron cargar los lugares', noNearbyPlaces: 'Aún no se encontraron lugares de Waynest cerca de ti',
          nearestPlaceSet: 'Lugar más cercano seleccionado', nearestFailed: 'No se pudieron cargar lugares cercanos',
          linkedPlace: 'Vinculado a un lugar de Waynest', placePlaceholder: 'ej. Belén, Ciudad Vieja\u2026',
          useMyLocation: 'Usar mi ubicación', useMyLocationShort: 'Mi ubicación', locating: 'Localizando\u2026',
          geoUnsupported: 'La ubicación no es compatible en este navegador', geoOk: 'Ubicación añadida a tu publicación',
          geoDenied: 'No se pudo leer tu ubicación \u2014 escribe un lugar en su lugar', currentLocation: 'Ubicación actual',
          needContent: 'Añade texto, fotos, un lugar o adjunta un plan guardado', planLabel: 'Plan guardado', planOptional: 'Sin plan adjunto',
          loadingPlans: 'Cargando planes\u2026', noPlans: 'Sin planes guardados', visibilityLabel: 'Quién puede ver',
          visPublic: 'Público', visFollowers: 'Seguidores', visPrivate: 'Privado', publishing: 'Publicando\u2026', publish: 'Publicar'
        }
      },
      inbox: { created: 'Conversación creada' },
      providerProfile: { title: 'Perfil del proveedor', loadFailed: 'Error al cargar el perfil del proveedor', noPosts: 'Aún no hay publicaciones.', follow: 'Seguir', unfollow: 'Dejar de seguir', counts: 'Seguidores: {{followers}} | Siguiendo: {{following}}', empty: 'Aún no hay publicaciones de proveedores.', followUpdateFailed: 'Error al actualizar el estado de seguimiento' },
      userProfile: { title: 'Perfil de usuario', loadFailed: 'Error al cargar el perfil', noPosts: 'Aún no hay publicaciones.', followUpdateFailed: 'Error al actualizar el estado de seguimiento' },
      postDetail: { loadFailed: 'Error al cargar los detalles de la publicación', addCommentFailed: 'Error al añadir comentario' },
      notifications: { loadFailed: 'Error al cargar notificaciones', markFailed: 'Error al marcar notificaciones' }
    },
    feedback: { loading: 'Cargando reseñas y comentarios...', errors: { reviewsLoad: 'Error al cargar reseñas. Intenta de nuevo en un momento.', commentsLoad: 'Error al cargar comentarios. Intenta de nuevo en un momento.' } },
    geo: {
      eyebrow: 'Explorar', title: 'Países, Ciudades y Monedas',
      subtitle: 'Navega por las ubicaciones y monedas disponibles en Waynest. Los datos se mantienen sincronizados con los CRUD del panel de administración.',
      countries: 'Países', cities: 'Ciudades', currencies: 'Monedas', items: 'elementos', loading: 'Cargando...',
      noCountries: 'No hay países disponibles.', noCities: 'No hay ciudades disponibles.', noCurrencies: 'No hay monedas disponibles.',
      errors: { loadFailed: 'Error al cargar datos de ubicación.' },
      headers: { name: 'Nombre', alpha2: 'Alfa 2', alpha3: 'Alfa 3', region: 'Región', capital: 'Capital', state: 'Estado', population: 'Población', latitude: 'Latitud', longitude: 'Longitud', code: 'Código', fractionSize: 'Tamaño de Fracción' }
    },
    placeDetail: {
      loadFailed: 'Error al cargar detalles del lugar', loginToWishlist: 'Inicia sesión para guardar lugares en tu lista de deseos',
      wishlistAdded: 'Añadido a la lista de deseos \u2764\ufe0f', wishlistFailed: 'Error al actualizar la lista de deseos', notFound: 'Lugar no encontrado.',
      backToExplore: 'Volver a Explorar', inWishlist: 'En la lista de deseos', addToWishlist: 'Añadir a la lista de deseos',
      noDescription: 'Aún no hay descripción disponible para este lugar.', type: 'Tipo', city: 'Ciudad', rating: 'Puntuación',
      notRatedYet: 'Aún no puntuado', reviews: 'Reseñas', reviewsCount: 'reseñas', planTrip: 'Planificar un viaje aquí'
    },
    discover: {
      description: 'Esta página se centra en el descubrimiento. Navega por el catálogo, busca proveedores públicos y abre detalles sin el desorden social',
      searchHeading: 'Buscar en el catálogo público', searchPlaceholder: 'Buscar proveedores, lugares y eventos',
      eventsTab: 'Eventos', allTab: 'Todos', noEventsMessage: 'No hay eventos próximos ahora. Vuelve más tarde'
    }
  },
  de: {
    landing: {
      hero: {
        badge: 'Vorabzugang',
        title: 'Plane deine n\u00e4chste Reise mit Waynest',
        description: 'Wir sind im Early Access. Sei einer der Ersten, die Reisepl\u00e4ne erstellen, Ziele entdecken und die Community mitgestalten.',
        btnPlan: 'Meine Reise planen', btnExplore: 'Orte entdecken'
      },
      features: {
        smartPlanning: { title: 'Intelligente Planung', description: 'Erstelle Reisepl\u00e4ne mit klaren Schritten und einer ruhigen, gef\u00fchrten Ablauf vom ersten Tag an.' },
        discoverPlaces: { title: 'Orte entdecken', description: 'Kuratiere Unterk\u00fcnfte und Erlebnisse, w\u00e4hrend wir die Plattform gemeinsam aufbauen.' },
        communityReviews: { title: 'Community-Bewertungen', description: 'Bewertungen werden nach dem Start freigeschaltet. Du wirst zu den ersten Stimmen geh\u00f6ren.' },
        saveShare: { title: 'Speichern & Teilen', description: 'Halte deine Reisen organisiert und teile sie in Sekunden mit Freunden.' }
      },
      stats: {
        tripsCreated: { value: '0', label: 'Erstellte Reisen', subLabel: 'Beta: Noch keine \u00f6ffentlichen Reisen' },
        activeTravelers: { value: '0', label: 'Aktive Reisende', subLabel: 'Sei der Erste, der dabei ist' },
        communityReviews: { value: '0', label: 'Community-Bewertungen', subLabel: 'Bewertungen nach dem Start verf\u00fcgbar' }
      }
    },
    landingPage: {
      hero: {
        badge: 'KI-Reisesystem mit echten Katalogdaten',
        title: 'Der Reiseplaner, der sich intelligent, klar und sofort n\u00fctzlich anf\u00fchlt.',
        description: 'Waynest verwandelt Ziel, Budget, Reisende, Interessen, Orte, \u00d6ffnungszeiten und \u00f6ffentliche Veranstaltungen in eine bearbeitbare Route, die vom ersten Bildschirm an sinnvoll ist.',
        btnPlan: 'KI-Planer starten', btnExplore: 'Live-Orte erkunden', btnCreateAccount: 'Konto erstellen',
        micro: { fastFlow: 'Schneller Gastzugang ohne Einrichtungsbarriere', explained: 'KI-Routenlogik erkl\u00e4rt, nicht versteckt', planning: 'Entwickelt zum Planen, Teilen und Anpassen' }
      },
      visual: {
        analysisKicker: 'KI-Routen-Engine', analysisTitle: 'Was Waynest tats\u00e4chlich analysiert',
        analysisItem1: 'Zielort, Stadt und Reisedauer', analysisItem2: 'Gruppengr\u00f6\u00dfe, Budget und ausgew\u00e4hlte W\u00e4hrung',
        analysisItem3: 'Interessen-Tags, Orte, Preise und \u00d6ffnungszeiten', analysisItem4: 'Passende Veranstaltungen und teilbare Routenstruktur',
        outputKicker: 'Beispielausgabe', outputTitle: 'Tag-f\u00fcr-Tag-Routenvorschau',
        dayLabel: 'Tag 1', morning: 'Morgen', afternoon: 'Nachmittag', evening: 'Abend',
        morningTitle: 'Wahrzeichen + Fr\u00fchst\u00fccksstopp', afternoonTitle: 'Budgetbewusste Aktivit\u00e4t mit echten \u00d6ffnungszeiten',
        eveningTitle: 'Event-Match oder lokale Restaurantempfehlung'
      },
      stats: { aria: 'Waynest-Plattformstatistiken', activeTravelers: 'Aktive Reisende', livePlaces: 'Live-Orte', countries: 'L\u00e4nder', sharedRoutes: 'Geteilte Routen' },
      standout: { eyebrow: 'Warum es hervorsticht', title: 'Entwickelt, um sich anders anzuf\u00fchlen als generische Reisetools', description: 'Der Wert ist auf einen Blick klar: KI-Planung, Live-Zieldaten und eine soziale Ebene, die Routen wiederverwendbar macht.' },
      differentiators: {
        realInputs: { title: 'KI, die mit echten Eingaben plant', description: 'Waynest erstellt Routen basierend auf deinem Ziel, Gruppengr\u00f6\u00dfe, Budget, Interessen, Ortspreisen und \u00d6ffnungszeiten.' },
        firstClick: { title: 'Ab dem ersten Klick nutzbar', description: 'G\u00e4ste k\u00f6nnen erkunden, eine Reise generieren und den Ablauf sofort verstehen, ohne komplexe Einrichtung.' },
        socialTravel: { title: 'Reisen als soziales Erlebnis', description: 'Verwandle private Planung in teilbare Routen, die andere Reisende ansehen, kopieren und anpassen k\u00f6nnen.' }
      },
      planner: {
        eyebrow: 'Planer-Ablauf', title: 'Einfach genug f\u00fcr jedermann', link: 'Planer \u00f6ffnen',
        setDestination: { title: 'Ziel festlegen', description: 'W\u00e4hle Land, Stadt, Reisedauer und Anzahl der Reisenden.' },
        giveContext: { title: 'Der KI Kontext geben', description: 'F\u00fcge Budget, W\u00e4hrung und Interessen hinzu, damit die Route zu deinem Stil passt.' },
        reviewRoute: { title: 'Eine echte Route pr\u00fcfen', description: 'Erhalte einen tagt\u00e4glichen Reiseplan mit Orten, Kosten, \u00d6ffnungszeiten und Veranstaltungen.' }
      },
      featured: { eyebrow: 'Vorgestellte Orte', title: 'Echte Ziele, die Benutzer sofort erkunden k\u00f6nnen', link: 'Alle Orte erkunden', loading: 'Lade Ziel-Highlights...', empty: 'Noch keine vorgestellten Orte verf\u00fcgbar.', fallbackDescription: 'Entdecke ein Ziel, das direkt in deine n\u00e4chste KI-Route eingebunden werden kann.' },
      events: { eyebrow: 'Bevorstehende Veranstaltungen', title: 'Momente, die der Planer in eine Route einweben kann', loading: 'Lade Veranstaltungen...', empty: 'Keine bevorstehenden Veranstaltungen verf\u00fcgbar.' },
      shared: { eyebrow: 'Geteilte Reisen', title: 'Beweis, dass Waynest-Routen \u00fcber einen einzelnen Nutzer hinaus bestehen k\u00f6nnen', loading: 'Lade geteilte Routen...', empty: 'Noch keine \u00f6ffentlichen Routen verf\u00fcgbar.', sharedTravelerRoute: 'Geteilte Reisenden-Route', publishedBy: 'Ver\u00f6ffentlicht von @{{username}}', publishedTravelRoute: 'Ver\u00f6ffentlichte Reiseroute' },
      cta: { eyebrow: 'Bereit zum Start?', title: 'Starte mit dem KI-Planer und wachse in die volle Waynest-Erfahrung hinein.', description: 'Generiere eine Route als Gast, melde dich an, um sie zu speichern, und baue weiter auf einem System, das Benutzerfreundlichkeit, Entdeckung und soziales Reisen vereint.', primary: 'Planer ausprobieren', secondary: 'Konto erstellen', ghost: 'Anmelden' },
      openDetails: 'Details \u00f6ffnen'
    },
    login: {
      welcomeBack: 'Willkommen zur\u00fcck', signIn: 'Melde dich bei deinem Konto an',
      emailOrUsername: 'E-Mail oder Benutzername', enterEmailOrUsername: 'Gib deine E-Mail oder deinen Benutzernamen ein',
      password: 'Passwort', enterPassword: 'Gib dein Passwort ein', loginButton: 'Anmelden',
      loggingIn: 'Anmeldung l\u00e4uft...', loginFailed: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
      showPassword: 'Passwort anzeigen', hidePassword: 'Passwort verstecken',
      chooseAccountTitle: 'Wie m\u00f6chtest du fortfahren?', chooseAccountSubtitle: 'Nutze Waynest als Reisender oder \u00f6ffne deine Gesch\u00e4ftstools.',
      choosePersonal: 'Pers\u00f6nliches Konto', choosePersonalHint: 'Home-Feed, Reisen, Buchungen und Profil als Reisender.',
      chooseProvider: 'Anbieter-Dashboard', chooseProviderHint: 'Verwalte dein Unternehmen, Angebote und Anbieterbuchungen.'
    },
    contact: {
      hero: { title: 'Kontakt aufnehmen', subtitle: 'Hast du eine Frage oder ein Feedback? Wir w\u00fcrden uns freuen, von dir zu h\u00f6ren!' },
      contactInformation: { title: 'Kontaktinformationen', email: 'E-Mail', emailValue: 'support@waynest.com', responseTime: 'Antwortzeit', responseTimeValue: 'Innerhalb von 24 Stunden', officeHours: 'B\u00fcrozeiten', officeHoursValue: 'Montag - Freitag: 9:00 - 18:00 Uhr' },
      followUs: { title: 'Folge uns', twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' },
      form: {
        title: 'Sende uns eine Nachricht', name: 'Name', namePlaceholder: 'Dein Name',
        email: 'E-Mail', emailPlaceholder: 'deine.email@beispiel.de', subject: 'Betreff', subjectPlaceholder: 'W\u00e4hle einen Betreff',
        subjectOptions: { general: 'Allgemeine Anfrage', support: 'Technischer Support', feedback: 'Feedback', partnership: 'Partnerschaft', other: 'Sonstiges' },
        message: 'Nachricht', messagePlaceholder: 'Erz\u00e4hl uns, wie wir helfen k\u00f6nnen...', sendButton: 'Nachricht senden', sending: 'Wird gesendet...', required: '*'
      },
      success: { title: 'Vielen Dank f\u00fcr deine Kontaktaufnahme!', message: 'Wir haben deine Nachricht erhalten und werden uns bald bei dir melden.', sendAnother: 'Weitere Nachricht senden' }
    },
    about: {
      hero: { title: '\u00dcber Waynest', subtitle: 'Dein vertrauensw\u00fcrdiger Begleiter f\u00fcr die Entdeckung erstaunlicher Reiseziele weltweit' },
      mission: { title: 'Unsere Mission', description: 'Bei Waynest glauben wir, dass Reisen zug\u00e4nglich, inspirierend und unvergesslich sein sollte. Unsere Mission ist es, Reisende mit den sch\u00f6nsten Zielen der Welt zu verbinden und ihnen zu helfen, verborgene Sch\u00e4tze zu entdecken und bleibende Erinnerungen zu schaffen.' },
      whatWeOffer: {
        title: 'Was wir bieten',
        discoverPlaces: { title: 'Orte entdecken', description: 'Erkunde tausende Reiseziele, von pulsierenden St\u00e4dten bis hin zu ruhigen Naturwundern. Finde den perfekten Ort f\u00fcr dein n\u00e4chstes Abenteuer.' },
        expertReviews: { title: 'Expertenbewertungen', description: 'Lies authentische Bewertungen von anderen Reisenden und erhalte Insidertipps zu den besten Orten zum Besuchen, Essen und \u00dcbernachten.' },
        planYourTrip: { title: 'Reise planen', description: 'Speichere deine Lieblingsziele, erstelle Wunschlisten und plane deinen perfekten Reiseplan an einem Ort.' },
        communityDriven: { title: 'Community-getrieben', description: 'Tritt einer Gemeinschaft leidenschaftlicher Reisender bei, die ihre Erfahrungen und Empfehlungen teilen, um anderen bei der Erkundung der Welt zu helfen.' }
      },
      whyChoose: {
        title: 'Warum Waynest w\u00e4hlen?',
        comprehensiveDatabase: 'Umfassende Datenbank:', comprehensiveDatabaseDesc: 'Greife auf Informationen \u00fcber L\u00e4nder, St\u00e4dte und Orte aus aller Welt zu.',
        realExperiences: 'Echte Erfahrungen:', realExperiencesDesc: 'Erhalte Einblicke von echten Reisenden, die dort waren.',
        easyPlanning: 'Einfache Planung:', easyPlanningDesc: 'Organisiere deine Reisepl\u00e4ne mit unseren intuitiven Werkzeugen.',
        alwaysUpdated: 'Immer aktuell:', alwaysUpdatedDesc: 'Unsere Plattform wird st\u00e4ndig mit neuen Zielen und aktuellen Inhalten aktualisiert.'
      },
      ourStory: { title: 'Unsere Geschichte', paragraph1: 'Waynest wurde aus einer einfachen Idee geboren: Reiseplanung einfacher und angenehmer zu gestalten. Wir verstehen, dass die Planung einer Reise \u00fcberw\u00e4ltigend sein kann, mit so vielen Optionen und Entscheidungen. Deshalb haben wir eine Plattform geschaffen, die alles an einem Ort vereint.', paragraph2: 'Egal, ob du ein erfahrener Reisender bist oder deine erste Reise planst, Waynest ist hier, um dir zu helfen, die Welt auf eine ganz neue Weise zu entdecken, zu planen und zu erleben.' },
      joinCommunity: { title: 'Tritt unserer Community bei', description: 'Bereit f\u00fcr dein n\u00e4chstes Abenteuer? Tritt tausenden Reisenden bei, die Waynest vertrauen, um erstaunliche Ziele zu entdecken und unvergessliche Erinnerungen zu schaffen.', getStarted: 'Loslegen', exploreDestinations: 'Reiseziele erkunden' }
    },
    destinations: {
      hero: { eyebrow: 'Entdecke die Welt', title: 'Reiseziele entdecken', subtitle: 'Erkunde erstaunliche L\u00e4nder und St\u00e4dte auf der ganzen Welt', searchPlaceholder: 'Suche Reiseziele, St\u00e4dte oder Hauptst\u00e4dte...' },
      regions: { all: 'Alle', asia: 'Asien', europe: 'Europa', africa: 'Afrika', americas: 'Amerika', oceania: 'Ozeanien' },
      labels: { capital: 'Hauptstadt:', region: 'Region:', cities: 'St\u00e4dte:', more: 'mehr' },
      filtersNav: 'Nach Region filtern', flagAlt: '{{country}}-Flagge', loading: 'Lade Reiseziele...',
      emptyState: 'Keine Reiseziele gefunden. Versuche, deine Suche oder Filter anzupassen.'
    },
    register: {
      title: 'Konto erstellen', subtitle: 'Melde dich an, um loszulegen',
      firstName: 'Vorname', firstNamePlaceholder: 'Gib deinen Vornamen ein', lastName: 'Nachname', lastNamePlaceholder: 'Gib deinen Nachnamen ein',
      email: 'E-Mail', emailPlaceholder: 'Gib deine E-Mail ein', username: 'Benutzername', usernamePlaceholder: 'W\u00e4hle einen Benutzernamen',
      password: 'Passwort', passwordPlaceholder: 'Gib dein Passwort ein (min. 8 Zeichen)',
      confirmPassword: 'Passwort best\u00e4tigen', confirmPasswordPlaceholder: 'Best\u00e4tige dein Passwort',
      signUp: 'Registrieren', creatingAccount: 'Konto wird erstellt...', alreadyHaveAccount: 'Bereits ein Konto?', signIn: 'Anmelden',
      passwordsDoNotMatch: 'Passw\u00f6rter stimmen nicht \u00fcberein', passwordTooShort: 'Das Passwort muss mindestens 8 Zeichen lang sein',
      registrationFailed: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.', showPassword: 'Passwort anzeigen', hidePassword: 'Passwort verstecken'
    },
    explore: {
      hero: { title: 'Orte erkunden', subtitle: 'Entdecke erstaunliche Reiseziele auf der ganzen Welt', searchPlaceholder: 'Suche Orte...', googleUnavailable: 'Google Places-Suche ist in dieser Umgebung nicht verf\u00fcgbar.', description: 'Diese Seite konzentriert sich auf die Entdeckung. Durchst\u00f6bere den Katalog, suche \u00f6ffentliche Anbieter und \u00f6ffne Details ohne soziales Durcheinander.' },
      categories: { all: 'Alle', restaurant: 'Restaurant', cafe: 'Caf\u00e9', attraction: 'Attraktion', museum: 'Museum', park: 'Park', historical: 'Historisch', events: 'Veranstaltungen' },
      search: { title: '\u00d6ffentlichen Katalog durchsuchen', placeholder: 'Suche Anbieter, Orte und Veranstaltungen...', loading: 'Suche l\u00e4uft...' },
      events: { title: 'Veranstaltungen', emptyMessage: 'Derzeit keine bevorstehenden Veranstaltungen. Schau sp\u00e4ter wieder vorbei.' },
      emptyState: 'Keine Orte gefunden'
    },
    navbar: {
      home: 'Startseite', explore: 'Entdecken', search: 'Suche', planner: 'Planer', social: 'Social',
      inbox: 'Posteingang', notifications: 'Benachrichtigungen', notificationsMenu: 'Benachrichtigungen', notificationsSeeAll: 'Alle Benachrichtigungen anzeigen',
      about: '\u00dcber uns', contact: 'Kontakt', login: 'Anmelden', signUp: 'Registrieren',
      userPanel: 'Benutzerpanel', adminPanel: 'Admin-Panel', providerPanel: 'Gesch\u00e4ftskonto',
      businessAccount: 'Gesch\u00e4ftskonto', logout: 'Abmelden', welcome: 'Willkommen',
      dark: 'Dunkel', light: 'Hell', language: 'Sprache',
      toggleSidebar: 'Seitenleiste umschalten', closeSidebar: 'Seitenleiste schlie\u00dfen',
      providerProfileSection: 'Anbieterprofil', backToFeed: 'Zur\u00fcck zum Feed', personalAccount: 'Pers\u00f6nliches Konto'
    },
    user: {
      sidebar: { dashboard: 'Dashboard', profile: 'Profil', bookings: 'Buchungen', wishlist: 'Wunschliste' },
      dashboard: { title: 'Dashboard', myBookings: 'Meine Buchungen', wishlist: 'Wunschliste', myReviews: 'Meine Bewertungen', profileStatus: 'Profilstatus', active: 'Aktiv' },
      wishlist: { title: 'Wunschliste', empty: 'Deine Wunschliste ist leer', emptyAction: 'Jetzt entdecken!', exploreButton: 'Orte erkunden', remove: 'Entfernen', rating: 'Bewertung' },
      bookings: {
        title: 'Meine Buchungen', empty: 'Noch keine Buchungen', emptyAction: 'Erkunde Orte, um deinen Besuch zu buchen!', exploreButton: 'Orte erkunden',
        persons: 'Personen', cancel: 'Stornieren',
        status: { pending: 'Ausstehend', confirmed: 'Best\u00e4tigt', cancelled: 'Storniert', completed: 'Abgeschlossen' }
      },
      profile: {
        connectionsBack: 'Zur\u00fcck', connectionsBackUser: 'Zur\u00fcck', title: 'Dein Profil', subtitle: 'Halte deine pers\u00f6nlichen Daten aktuell.',
        name: 'Name', email: 'E-Mail', phone: 'Telefon', saveChanges: '\u00c4nderungen speichern', accountCenter: 'Konto-Center'
      },
      tripPlanner: { title: 'KI-Reiseplaner', planYourTrip: 'Plane deine perfekte Reise' }
    },
    provider: {
      sidebar: {
        feed: 'Feed', dashboard: 'Dashboard', profile: 'Profil', createPost: 'Beitrag erstellen',
        sectionOverview: '\u00dcbersicht', sectionOperations: 'Betrieb', sectionPresence: 'Pr\u00e4senz', sectionAccount: 'Konto',
        publicPage: '\u00d6ffentliche Seite', businessSettings: 'Gesch\u00e4ftseinstellungen', myPlaces: 'Meine Orte',
        events: 'Veranstaltungen', bookings: 'Buchungen', reviews: 'G\u00e4stebewertungen'
      },
      createPost: { title: 'Beitrag erstellen', subtitle: 'Teile Updates, Angebote oder Ank\u00fcndigungen mit deinen G\u00e4sten.' },
      business: {
        loadingTitle: 'Wird geladen\u2026', sharePage: 'Seite teilen', linkCopied: 'Link in die Zwischenablage kopiert', linkCopyFailed: 'Link konnte nicht kopiert werden',
        statsLabel: 'Gesch\u00e4ftsstatistiken', statPlaces: 'Orte', statRating: 'Durchschnittsbewertung', statReviews: 'Feedback', statBookings: 'Buchungen',
        tabsAria: 'Gesch\u00e4ftsseitenbereiche', tabOverview: '\u00dcbersicht', tabServices: 'Orte', tabEvents: 'Veranstaltungen', tabReviews: 'G\u00e4stefeedback',
        placesTitle: 'Orte', noPlaces: 'Noch keine Orte gelistet.', eventsTitle: 'Bevorstehende Veranstaltungen', noEvents: 'Keine bevorstehenden Veranstaltungen geplant.',
        reviewsTitle: 'G\u00e4stefeedback', guestFeedbackTitle: 'G\u00e4stefeedback', guestFeedbackSub: 'Bewertungen und Kommentare von Besuchern nach ihrem Erlebnis.',
        feedbackStripTitle: 'G\u00e4stefeedback', feedbackStripHint: '\u00d6ffne die vollst\u00e4ndige Liste der Bewertungen und Kommentare',
        feedbackStripEmpty: 'Noch keine Bewertungen \u2014 erscheinen nach G\u00e4stebesuch', feedbackCountShort: 'Bewertungen', feedbackStripAria: 'G\u00e4stefeedback',
        mapTitle: 'Standort', mapSub: 'Servicebereich auf der Karte', placesSub: 'Standorte und Eintr\u00e4ge dieses Unternehmens',
        eventsSub: 'Geplante Erlebnisse und Termine', reviewsSub: 'Feedback von G\u00e4sten', postsSub: 'Von diesem Unternehmen ver\u00f6ffentlichte Updates',
        viewMap: 'Karte', bookNow: 'Buchen', bookNowComingSoon: 'Buchen (Demn\u00e4chst)'
      },
      common: { active: 'Aktiv', inactive: 'Inaktiv', notSetup: 'Dein Anbieterkonto ist nicht eingerichtet. Kontaktiere einen Administrator.' },
      businessFeed: {
        titleFallback: 'Gesch\u00e4ft', atAGlance: 'Auf einen Blick', heroLead: 'Verwalte Beitr\u00e4ge, Buchungen und deine \u00f6ffentliche Pr\u00e4senz von einem Ort aus.',
        heroSettings: 'Gesch\u00e4ftseinstellungen', separationNotice: 'Dein Gesch\u00e4ftskonto ist getrennt von deinem pers\u00f6nlichen Profil. Die Aktivit\u00e4t hier gilt nur f\u00fcr dein Unternehmen.',
        feedTitle: 'Gesch\u00e4fts-Feed', peopleTitle: 'Zielgruppe & Personen',
        peopleBody: 'Deine \u00f6ffentliche Seite zeigt Follower. Pers\u00f6nliche Chats und Freunde bleiben in Nachrichten unter deinem pers\u00f6nlichen Konto. Teamzugriff f\u00fcr dieses Unternehmen wird sp\u00e4ter hier verf\u00fcgbar sein.',
        viewPublicPage: '\u00d6ffentliche Gesch\u00e4ftsseite \u00f6ffnen', personalMessages: 'Pers\u00f6nliche Nachrichten & Freunde', teamComingSoon: 'Teammitglieder zur Mitverwaltung einzuladen, kommt bald.',
        loadError: 'Gesch\u00e4fts-Feed konnte nicht geladen werden', noPosts: 'Noch keine Beitr\u00e4ge in deinem Gesch\u00e4fts-Feed.',
        workspaceEyebrow: 'Gesch\u00e4ftsarbeitsbereich', trustVerified: 'Verifiziertes Unternehmen', trustPending: 'Verifizierung l\u00e4uft', trustAttention: 'Aktion auf deinem Konto erforderlich',
        opsNav: 'Betrieb', opsPlaces: 'Eintr\u00e4ge', opsEvents: 'Veranstaltungen', opsBookings: 'Buchungen', opsReviews: 'G\u00e4stebewertungen',
        emptyFeedTitle: 'Beginne, G\u00e4ste zu erreichen',
        noPostsRich: 'Beitr\u00e4ge, die du als dieses Unternehmen ver\u00f6ffentlichst, erscheinen hier und auf deiner \u00f6ffentlichen Seite. Teile Updates, Fotos und Angebote an einem Ort.',
        ctaCreatePost: 'Gesch\u00e4ftsbeitrag erstellen', ctaAddPlace: 'Eintr\u00e4ge verwalten',
        quickNav: 'Gesch\u00e4fts-Schnellzugriff', quickPlaces: 'Orte', quickBookings: 'Buchungen', quickSettings: 'Einstellungen',
        metricMeta: { places: 'Mit deinem Unternehmen verkn\u00fcpfte Orte', bookings: 'Buchungen \u00fcber alle deine Eintr\u00e4ge', reviews: 'Bewertungen von G\u00e4sten', rating: 'Durchschnitt aller Bewertungen' }
      },
      dashboard: {
        defaultTitle: 'Anbieter-Dashboard',
        metrics: { totalPlaces: 'Orte gesamt', totalBookings: 'Buchungen gesamt', totalReviews: 'Bewertungen gesamt', averageRating: 'Durchschnittsbewertung' },
        actions: { managePlaces: 'Orte verwalten', viewBookings: 'Buchungen anzeigen', profile: 'Anbieterprofil' },
        feedback: { loadError: 'Anbieter-Dashboard konnte nicht geladen werden' }
      },
      places: {
        title: 'Meine Orte', empty: 'Keine Orte f\u00fcr dein Anbieterkonto gefunden.', add: 'Ort hinzuf\u00fcgen', edit: 'Bearbeiten', save: 'Speichern',
        modalCreate: 'Ort hinzuf\u00fcgen', modalEdit: 'Ort bearbeiten', typeAndRating: '{{type}} \u00b7 {{rating}} \u2605',
        table: { image: '', name: 'Name', type: 'Typ', city: 'Stadt', rating: 'Bewertung', active: 'Status', actions: 'Aktionen' },
        fields: { name: 'Name', description: 'Beschreibung', type: 'Typ', city: 'Stadt', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', slug: 'Slug (optional)', active: 'Aktiv' },
        actions: { editPlaces: 'Orte bearbeiten', editPlace: 'Bearbeiten' },
        feedback: { loadError: 'Orte konnten nicht geladen werden' }
      },
      events: {
        title: 'Veranstaltungen', add: 'Neue Veranstaltung', edit: 'Bearbeiten', save: 'Speichern', modalCreate: 'Veranstaltung erstellen', modalEdit: 'Veranstaltung bearbeiten',
        needVenue: 'Erstelle zuerst einen Ort, um Veranstaltungen auszurichten.',
        columns: { title: 'Titel', venue: 'Veranstaltungsort', start: 'Beginnt', price: 'Preis', active: 'Aktiv', actions: 'Aktionen' },
        fields: { title: 'Titel', description: 'Beschreibung', venue: 'Veranstaltungsort', start: 'Beginn', end: 'Ende', tickets: 'Verf\u00fcgbare Tickets', price: 'Ticketpreis', currency: 'W\u00e4hrung', active: 'Ver\u00f6ffentlicht' }
      },
      bookings: {
        title: 'Anbieterbuchungen', filterAll: 'Alle Status',
        columns: { place: 'Ort', date: 'Buchungsdatum', persons: 'G\u00e4ste', total: 'Gesamt', status: 'Status' },
        status: { pending: 'Ausstehend', confirmed: 'Best\u00e4tigt', completed: 'Abgeschlossen', cancelled: 'Storniert' },
        feedback: { loadError: 'Buchungen konnten nicht geladen werden', statusError: 'Buchungsstatus konnte nicht aktualisiert werden' }
      },
      profile: {
        title: 'Anbieterprofil',
        fields: { displayName: 'Anzeigename', slug: 'Slug', providerType: 'Anbietertyp', phone: 'Telefon', website: 'Webseite' },
        providerTypes: { HOTEL: 'Hotel', RESTAURANT: 'Restaurant', TOUR_PROVIDER: 'Reiseveranstalter', EVENT_ORGANIZER: 'Veranstaltungsorganisator', ACTIVITY_PROVIDER: 'Aktivit\u00e4tsanbieter' },
        actions: { save: '\u00c4nderungen speichern' },
        validation: { displayName: 'Bitte gib einen Anzeigenamen ein', slug: 'Bitte gib einen Slug ein', providerType: 'Bitte w\u00e4hle einen Anbietertyp', phone: 'Bitte gib eine Telefonnummer ein' },
        feedback: { loadError: 'Profil konnte nicht geladen werden', updateSuccess: 'Profil erfolgreich aktualisiert', updateError: 'Profil konnte nicht aktualisiert werden' }
      },
      apply: {
        steps: { business: 'Gesch\u00e4ft', contact: 'Kontakt', review: 'Pr\u00fcfung' },
        stepBusinessTitle: 'Gesch\u00e4ftsdetails', stepContactTitle: 'Kontakt & Typ', stepReviewTitle: 'Pr\u00fcfen & einreichen',
        highlights: {
          businessBasics: { title: 'Alle Gesch\u00e4ftsgrundlagen', text: 'Name, Beschreibung, Standort, Steuerdetails und Kategorien in einem klaren Ablauf.' },
          deviceImages: { title: 'Bilder von deinem Ger\u00e4t', text: 'Lade dein Logo und Titelbild direkt hoch, mit sofortiger Vorschau.' },
          ownerFirst: { title: 'Inhaber-zuerst-Zugang', text: 'Dein Konto wird zum Gesch\u00e4ftsinhaber und kann sp\u00e4ter Teammitglieder hinzuf\u00fcgen.' }
        },
        next: 'Weiter', back: 'Zur\u00fcck', successTitle: 'Antrag erhalten', successBody: 'Vielen Dank. Dein Antrag wird gepr\u00fcft. Wir benachrichtigen dich, wenn eine Entscheidung getroffen wurde.', goHome: 'Zur\u00fcck zur Startseite'
      }
    },
    admin: {
      dashboard: { title: 'Admin-Dashboard', totalUsers: 'Benutzer gesamt', totalProviders: 'Anbieter gesamt', totalPlaces: 'Orte gesamt', totalReviews: 'Bewertungen gesamt', failedToLoadStats: 'Statistiken konnten nicht geladen werden' },
      common: {
        actions: 'Aktionen', edit: 'Bearbeiten', delete: 'L\u00f6schen', add: 'Hinzuf\u00fcgen', save: 'Speichern', cancel: 'Abbrechen', loading: 'Wird geladen...',
        totalItems: 'Gesamt', items: 'Elemente', pleaseInput: 'Bitte eingeben', failedToSubmit: 'Formular konnte nicht gesendet werden',
        confirmDelete: 'L\u00f6schen best\u00e4tigen', deleteConfirmMessage: 'Bist du sicher, dass du dieses Element l\u00f6schen m\u00f6chtest? Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.',
        deleteButton: 'L\u00f6schen', createdSuccessfully: 'erfolgreich erstellt', updatedSuccessfully: 'erfolgreich aktualisiert', deletedSuccessfully: 'erfolgreich gel\u00f6scht',
        entityCreatedSuccessfully: '{{entity}} erfolgreich erstellt', entityUpdatedSuccessfully: '{{entity}} erfolgreich aktualisiert', entityDeletedSuccessfully: '{{entity}} erfolgreich gel\u00f6scht',
        failedToLoad: 'Laden fehlgeschlagen', failedToSave: 'Speichern fehlgeschlagen', failedToDelete: 'L\u00f6schen fehlgeschlagen', yes: 'Ja', no: 'Nein'
      },
      sidebar: {
        dashboard: 'Dashboard', users: 'Benutzer', providers: 'Anbieter', places: 'Orte', countries: 'L\u00e4nder', cities: 'St\u00e4dte',
        currencies: 'W\u00e4hrungen', tags: 'Tags', events: 'Veranstaltungen', reviews: 'Bewertungen', placePricing: 'Ortspreise',
        openingHours: '\u00d6ffnungszeiten', providerMembership: 'Anbietermitgliedschaft', devices: 'Ger\u00e4te'
      },
      users: { title: 'Benutzerverwaltung', addUser: 'Benutzer hinzuf\u00fcgen', editUser: 'Benutzer bearbeiten', deleteUser: 'Benutzer l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du den Benutzer l\u00f6schen m\u00f6chtest', firstName: 'Vorname', lastName: 'Nachname', email: 'E-Mail', username: 'Benutzername', password: 'Passwort', role: 'Rolle', phone: 'Telefon', status: 'Status', createdAt: 'Erstellt am' },
      providers: { title: 'Anbieterverwaltung', addProvider: 'Anbieter hinzuf\u00fcgen', editProvider: 'Anbieter bearbeiten', deleteProvider: 'Anbieter l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du den Anbieter l\u00f6schen m\u00f6chtest', displayName: 'Anzeigename', providerType: 'Anbietertyp', website: 'Webseite', verificationStatus: 'Verifizierungsstatus' },
      places: { title: 'Ortsverwaltung', addPlace: 'Ort hinzuf\u00fcgen', editPlace: 'Ort bearbeiten', deletePlace: 'Ort l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du den Ort l\u00f6schen m\u00f6chtest', name: 'Name', slug: 'Slug', description: 'Beschreibung', type: 'Typ', city: 'Stadt', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', ratingAverage: 'Durchschnittsbewertung', ratingCount: 'Bewertungsanzahl', isActive: 'Aktiv', isVerified: 'Verifiziert' },
      countries: { title: 'L\u00e4nderverwaltung', addCountry: 'Land hinzuf\u00fcgen', editCountry: 'Land bearbeiten', deleteCountry: 'Land l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du das Land l\u00f6schen m\u00f6chtest', nativeName: 'Landesname', alpha2: 'Alpha 2', alpha3: 'Alpha 3', numeric: 'Numerischer Code' },
      cities: { title: 'St\u00e4dteverwaltung', addCity: 'Stadt hinzuf\u00fcgen', editCity: 'Stadt bearbeiten', deleteCity: 'Stadt l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du die Stadt l\u00f6schen m\u00f6chtest', stateName: 'Bundesland', population: 'Einwohner' },
      currencies: { title: 'W\u00e4hrungsverwaltung', addCurrency: 'W\u00e4hrung hinzuf\u00fcgen', editCurrency: 'W\u00e4hrung bearbeiten', deleteCurrency: 'W\u00e4hrung l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du die W\u00e4hrung l\u00f6schen m\u00f6chtest', code: 'Code', fractionSize: 'Nachkommastellen' },
      tags: { title: 'Tag-Verwaltung', addTag: 'Tag hinzuf\u00fcgen', editTag: 'Tag bearbeiten', deleteTag: 'Tag l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du den Tag l\u00f6schen m\u00f6chtest' },
      events: { title: 'Veranstaltungsverwaltung', addEvent: 'Veranstaltung hinzuf\u00fcgen', editEvent: 'Veranstaltung bearbeiten', deleteEvent: 'Veranstaltung l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du die Veranstaltung l\u00f6schen m\u00f6chtest', titleField: 'Titel', venue: 'Veranstaltungsort', startDate: 'Startdatum', endDate: 'Enddatum', availableTickets: 'Verf\u00fcgbare Tickets', ticketPrice: 'Ticketpreis', currencyCode: 'W\u00e4hrungscode' },
      reviews: { title: 'Bewertungsverwaltung', addReview: 'Bewertung hinzuf\u00fcgen', editReview: 'Bewertung bearbeiten', deleteReview: 'Bewertung l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du die Bewertung l\u00f6schen m\u00f6chtest' },
      placePricing: { title: 'Preisverwaltung', addPlacePricing: 'Preis hinzuf\u00fcgen', editPlacePricing: 'Preis bearbeiten', deletePlacePricing: 'Preis l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du den Preis l\u00f6schen m\u00f6chtest' },
      placeOpeningHours: {
        title: '\u00d6ffnungszeitenverwaltung', addPlaceOpeningHours: '\u00d6ffnungszeit hinzuf\u00fcgen', editPlaceOpeningHours: '\u00d6ffnungszeit bearbeiten', deletePlaceOpeningHours: '\u00d6ffnungszeit l\u00f6schen',
        deleteConfirm: 'Bist du sicher, dass du diese \u00d6ffnungszeit l\u00f6schen m\u00f6chtest', dayOfWeek: 'Wochentag', openTime: '\u00d6ffnungszeit', closeTime: 'Schlie\u00dfzeit',
        days: { sunday: 'Sonntag', monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag' }
      },
      providerMembership: { title: 'Anbietermitgliedschaftsverwaltung', addProviderMembership: 'Mitgliedschaft hinzuf\u00fcgen', editProviderMembership: 'Mitgliedschaft bearbeiten', deleteProviderMembership: 'Mitgliedschaft l\u00f6schen', deleteConfirm: 'Bist du sicher, dass du diese Mitgliedschaft l\u00f6schen m\u00f6chtest', providerRole: 'Anbieterrolle' }
    },
    languages: { en: 'Englisch', ar: 'Arabisch', ru: 'Russisch', fr: 'Franz\u00f6sisch', tr: 'T\u00fcrkisch', es: 'Spanisch', de: 'Deutsch', zh: 'Chinesisch', pt: 'Portugiesisch' },
    search: {
      label: 'Suche', placeholder: 'Personen, Orte, Unternehmen\u2026', placeholderGuest: 'Anbieter, Orte, Veranstaltungen\u2026',
      submit: 'Los', failed: 'Suche fehlgeschlagen', resultsFor: 'Ergebnisse f\u00fcr \u201e{{q}}\u201c',
      emptyTitle: 'Suche', useBar: 'Nutze das Suchfeld auf dieser Seite.',
      typeToSearch: 'Gib oben ein, um nach Personen, Anbietern, Orten und Veranstaltungen zu suchen.',
      noResults: 'Noch keine Treffer.', planFromHere: 'Von hier aus planen',
      planNeedsCity: 'W\u00e4hle einen Ort mit einer Stadt, um von hier aus zu planen.',
      publicTripsTitle: '\u00d6ffentliche Reisen von Reisenden', publicTripsEmpty: 'Noch keine \u00f6ffentlichen Reisen. Teile einen Plan, um ihn hier zu sehen.',
      publicTripsLoadFailed: '\u00d6ffentliche Reisen konnten nicht geladen werden.', publicTripsBy: 'Von @{{username}}'
    },
    friends: { connected: 'Freunde', requestSent: 'Anfrage gesendet', accept: 'Akzeptieren', decline: 'Ablehnen', add: 'Freund hinzuf\u00fcgen' },
    social: {
      profile: 'Meine Beitr\u00e4ge', settings: 'Einstellungen', follow: 'Folgen', unfollow: 'Entfolgen',
      feed: {
        title: 'Community-Feed', openSearch: 'Suche', loading: 'Feed wird geladen...', empty: 'Noch keine Beitr\u00e4ge in diesem Feed.',
        traveler: 'Reisender', openSharedTrip: 'Geteilte Reise \u00f6ffnen', loadFailed: 'Sozialer Feed konnte nicht geladen werden', savedPlansLoadFailed: 'Gespeicherte Pl\u00e4ne konnten nicht geladen werden',
        loginToPublish: 'Bitte melde dich an, um zu ver\u00f6ffentlichen', selectPlanFirst: 'Bitte w\u00e4hle einen gespeicherten Plan', published: 'Beitrag ver\u00f6ffentlicht',
        publishedToast: 'Ver\u00f6ffentlicht!', publishFailed: 'Ver\u00f6ffentlichung fehlgeschlagen', loginFirst: 'Bitte zuerst anmelden', likeUpdated: 'Gef\u00e4llt mir aktualisiert',
        savedToAccount: 'In deinem Konto gespeichert', shareCopied: 'Reiselink kopiert', shareUnavailable: 'Dieser Beitrag hat noch keine teilbare Reise',
        actions: { like: 'Gef\u00e4llt mir', saveCopy: 'Speichern & Kopieren', comments: 'Kommentare', share: 'Teilen' },
        filters: { forYou: 'F\u00fcr dich', following: 'Gefolgt', providers: 'Anbieter' },
        composer: {
          eyebrow: 'Auf Waynest ver\u00f6ffentlichen', title: 'Teile deine Reise',
          helper: 'Schreibe eine Notiz, f\u00fcge Fotos oder einen Ort hinzu oder h\u00e4nge einen gespeicherten Plan an \u2014 ver\u00f6ffentliche, was dir wichtig ist.',
          postTitle: 'Titel', postTitlePlaceholder: 'Beitragstitel (optional)', bodyLabel: 'Was m\u00f6chtest du mitteilen?',
          bodyPlaceholder: 'Schreibe etwas \u00fcber deine Reise, einen Tipp oder einen Moment\u2026',
          imagesSection: 'Fotos', imagesHint: 'PNG oder JPG, bis zu 6 Bilder \u00b7 je 5 MB',
          dropzone: 'Bilder hier ablegen oder klicken zum Durchsuchen', removeImage: 'Entfernen', uploading: 'Wird hochgeladen\u2026',
          placeSection: 'Ort', placeHint: 'Optional \u2014 Stadt, Wahrzeichen oder Adresse, die im Beitrag angezeigt wird',
          placeHintDb: 'Suche Waynest-Orte oder verwende deinen Standort, um den n\u00e4chstgelegenen Eintrag auszuw\u00e4hlen.',
          placeSearchFailed: 'Orte konnten nicht geladen werden', noNearbyPlaces: 'Noch keine Waynest-Orte in deiner N\u00e4he gefunden',
          nearestPlaceSet: 'N\u00e4chstgelegener Ort ausgew\u00e4hlt', nearestFailed: 'Nahegelegene Orte konnten nicht geladen werden',
          linkedPlace: 'Mit Waynest-Ort verkn\u00fcpft', placePlaceholder: 'z.B. Bethlehem, Altstadt\u2026',
          useMyLocation: 'Meinen Standort verwenden', useMyLocationShort: 'Mein Standort', locating: 'Standort wird ermittelt\u2026',
          geoUnsupported: 'Standortermittlung wird in diesem Browser nicht unterst\u00fctzt', geoOk: 'Standort zu deinem Beitrag hinzugef\u00fcgt',
          geoDenied: 'Standort konnte nicht ermittelt werden \u2014 gib stattdessen einen Ort ein', currentLocation: 'Aktueller Standort',
          needContent: 'F\u00fcge Text, Fotos, einen Ort oder einen gespeicherten Plan hinzu', planLabel: 'Gespeicherter Plan', planOptional: 'Kein Plan angeh\u00e4ngt',
          loadingPlans: 'Pl\u00e4ne werden geladen\u2026', noPlans: 'Keine gespeicherten Pl\u00e4ne', visibilityLabel: 'Wer kann sehen',
          visPublic: '\u00d6ffentlich', visFollowers: 'Follower', visPrivate: 'Privat', publishing: 'Wird ver\u00f6ffentlicht\u2026', publish: 'Ver\u00f6ffentlichen'
        }
      },
      inbox: { created: 'Unterhaltung erstellt' },
      providerProfile: { title: 'Anbieterprofil', loadFailed: 'Anbieterprofil konnte nicht geladen werden', noPosts: 'Noch keine Beitr\u00e4ge.', follow: 'Folgen', unfollow: 'Entfolgen', counts: 'Follower: {{followers}} | Gefolgt: {{following}}', empty: 'Noch keine Anbieterbeitr\u00e4ge.', followUpdateFailed: 'Follow-Status konnte nicht aktualisiert werden' },
      userProfile: { title: 'Benutzerprofil', loadFailed: 'Profil konnte nicht geladen werden', noPosts: 'Noch keine Beitr\u00e4ge.', followUpdateFailed: 'Follow-Status konnte nicht aktualisiert werden' },
      postDetail: { loadFailed: 'Beitragsdetails konnten nicht geladen werden', addCommentFailed: 'Kommentar konnte nicht hinzugef\u00fcgt werden' },
      notifications: { loadFailed: 'Benachrichtigungen konnten nicht geladen werden', markFailed: 'Benachrichtigungen konnten nicht markiert werden' }
    },
    feedback: { loading: 'Lade Bewertungen und Kommentare...', errors: { reviewsLoad: 'Bewertungen konnten nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.', commentsLoad: 'Kommentare konnten nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.' } },
    geo: {
      eyebrow: 'Entdecken', title: 'L\u00e4nder, St\u00e4dte & W\u00e4hrungen',
      subtitle: 'Durchst\u00f6bere die in Waynest verf\u00fcgbaren Orte und W\u00e4hrungen. Die Daten werden mit den Admin-CRUDs synchron gehalten.',
      countries: 'L\u00e4nder', cities: 'St\u00e4dte', currencies: 'W\u00e4hrungen', items: 'Elemente', loading: 'Wird geladen...',
      noCountries: 'Keine L\u00e4nder verf\u00fcgbar.', noCities: 'Keine St\u00e4dte verf\u00fcgbar.', noCurrencies: 'Keine W\u00e4hrungen verf\u00fcgbar.',
      errors: { loadFailed: 'Standortdaten konnten nicht geladen werden.' },
      headers: { name: 'Name', alpha2: 'Alpha 2', alpha3: 'Alpha 3', region: 'Region', capital: 'Hauptstadt', state: 'Bundesland', population: 'Einwohner', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', code: 'Code', fractionSize: 'Nachkommastellen' }
    },
    placeDetail: {
      loadFailed: 'Ortsdetails konnten nicht geladen werden', loginToWishlist: 'Melde dich an, um Orte zu deiner Wunschliste hinzuzuf\u00fcgen',
      wishlistAdded: 'Zur Wunschliste hinzugef\u00fcgt \u2764\ufe0f', wishlistFailed: 'Wunschliste konnte nicht aktualisiert werden', notFound: 'Ort nicht gefunden.',
      backToExplore: 'Zur\u00fcck zur Erkundung', inWishlist: 'Auf der Wunschliste', addToWishlist: 'Zur Wunschliste hinzuf\u00fcgen',
      noDescription: 'Noch keine Beschreibung f\u00fcr diesen Ort verf\u00fcgbar.', type: 'Typ', city: 'Stadt', rating: 'Bewertung',
      notRatedYet: 'Noch nicht bewertet', reviews: 'Bewertungen', reviewsCount: 'Bewertungen', planTrip: 'Hier eine Reise planen'
    },
    discover: {
      description: 'Diese Seite konzentriert sich auf die Entdeckung. Durchst\u00f6bere den Katalog, suche \u00f6ffentliche Anbieter und \u00f6ffne Details ohne soziales Durcheinander',
      searchHeading: '\u00d6ffentlichen Katalog durchsuchen', searchPlaceholder: 'Suche Anbieter, Orte und Veranstaltungen',
      eventsTab: 'Veranstaltungen', allTab: 'Alle', noEventsMessage: 'Derzeit keine bevorstehenden Veranstaltungen. Schau sp\u00e4ter wieder vorbei'
    }
  },
  zh: {
    landing: {
      hero: {
        badge: '\u65e9\u671f\u4f53\u9a8c',
        title: '\u4f7f\u7528Waynest\u89c4\u5212\u4f60\u7684\u4e0b\u4e00\u6b21\u65c5\u884c',
        description: '\u6211\u4eec\u5904\u4e8e\u65e9\u671f\u4f53\u9a8c\u9636\u6bb5\u3002\u6210\u4e3a\u9996\u6279\u5728\u6211\u4eec\u53d1\u5e03\u65f6\u521b\u5efa\u884c\u7a0b\u3001\u53d1\u73b0\u76ee\u7684\u5730\u548c\u5851\u9020\u793e\u533a\u7684\u4eba\u3002',
        btnPlan: '\u89c4\u5212\u6211\u7684\u65c5\u884c', btnExplore: '\u63a2\u7d22\u76ee\u7684\u5730'
      },
      features: {
        smartPlanning: { title: '\u667a\u80fd\u89c4\u5212', description: '\u4ece\u7b2c\u4e00\u5929\u5f00\u59cb\uff0c\u901a\u8fc7\u6e05\u6670\u7684\u6b65\u9aa4\u548c\u5f15\u5bfc\u6d41\u7a0b\u521b\u5efa\u884c\u7a0b\u3002' },
        discoverPlaces: { title: '\u53d1\u73b0\u5730\u70b9', description: '\u5728\u6211\u4eec\u5171\u540c\u53d1\u5c55\u5e73\u53f0\u7684\u540c\u65f6\uff0c\u7cbe\u9009\u4f4f\u5bbf\u548c\u4f53\u9a8c\u3002' },
        communityReviews: { title: '\u793e\u533a\u8bc4\u4ef7', description: '\u8bc4\u4ef7\u5c06\u5728\u53d1\u5e03\u540e\u5f00\u653e\u3002\u4f60\u5c06\u6210\u4e3a\u9996\u6279\u58f0\u97f3\u4e4b\u4e00\u3002' },
        saveShare: { title: '\u4fdd\u5b58\u4e0e\u5206\u4eab', description: '\u4fdd\u6301\u4f60\u7684\u65c5\u884c\u4e95\u7136\u6709\u5e8f\uff0c\u5e76\u5728\u51e0\u79d2\u949f\u5185\u4e0e\u670b\u53cb\u5206\u4eab\u3002' }
      },
      stats: {
        tripsCreated: { value: '0', label: '\u5df2\u521b\u5efa\u7684\u884c\u7a0b', subLabel: 'Beta\uff1a\u6682\u65e0\u516c\u5f00\u884c\u7a0b' },
        activeTravelers: { value: '0', label: '\u6d3b\u8dc3\u65c5\u884c\u8005', subLabel: '\u6210\u4e3a\u7b2c\u4e00\u4e2a\u52a0\u5165\u7684\u4eba' },
        communityReviews: { value: '0', label: '\u793e\u533a\u8bc4\u4ef7', subLabel: '\u8bc4\u4ef7\u5c06\u5728\u53d1\u5e03\u540e\u5f00\u653e' }
      }
    },
    landingPage: {
      hero: {
        badge: '\u62e5\u6709\u771f\u5b9e\u76ee\u5f55\u6570\u636e\u7684AI\u65c5\u884c\u7cfb\u7edf',
        title: '\u8ba9\u65c5\u884c\u89c4\u5212\u53d8\u5f97\u667a\u80fd\u3001\u6e05\u6670\u4e14\u5373\u65f6\u6709\u7528\u3002',
        description: 'Waynest\u5c06\u76ee\u7684\u5730\u3001\u9884\u7b97\u3001\u65c5\u884c\u8005\u3001\u5174\u8da3\u3001\u5730\u70b9\u3001\u8425\u4e1a\u65f6\u95f4\u548c\u516c\u5171\u6d3b\u52a8\u8f6c\u5316\u4e3a\u53ef\u7f16\u8f91\u7684\u8def\u7ebf\uff0c\u4ece\u7b2c\u4e00\u4e2a\u5c4f\u5e55\u5f00\u59cb\u5c31\u6709\u610f\u4e49\u3002',
        btnPlan: '\u542f\u52a8AI\u89c4\u5212\u5668', btnExplore: '\u63a2\u7d22\u5b9e\u65f6\u5730\u70b9', btnCreateAccount: '\u521b\u5efa\u8d26\u6237',
        micro: { fastFlow: '\u5feb\u901f\u8bbf\u5ba2\u6d41\u7a0b\uff0c\u65e0\u9700\u590d\u6742\u8bbe\u7f6e', explained: 'AI\u8def\u7ebf\u903b\u8f91\u6e05\u6670\u89e3\u91ca\uff0c\u800c\u975e\u9690\u85cf', planning: '\u4e13\u4e3a\u89c4\u5212\u3001\u5206\u4eab\u548c\u91cd\u65b0\u7ec4\u5408\u800c\u8bbe\u8ba1' }
      },
      visual: {
        analysisKicker: 'AI\u8def\u7ebf\u5f15\u64ce', analysisTitle: 'Waynest\u5b9e\u9645\u5206\u6790\u7684\u5185\u5bb9',
        analysisItem1: '\u76ee\u7684\u5730\u3001\u57ce\u5e02\u548c\u884c\u7a0b\u957f\u5ea6', analysisItem2: '\u56e2\u961f\u89c4\u6a21\u3001\u9884\u7b97\u548c\u6240\u9009\u8d27\u5e01',
        analysisItem3: '\u5174\u8da3\u6807\u7b7e\u3001\u5730\u70b9\u3001\u4ef7\u683c\u548c\u8425\u4e1a\u65f6\u95f4', analysisItem4: '\u5339\u914d\u7684\u6d3b\u52a8\u548c\u53ef\u5206\u4eab\u7684\u8def\u7ebf\u7ed3\u6784',
        outputKicker: '\u793a\u4f8b\u8f93\u51fa', outputTitle: '\u9010\u65e5\u8def\u7ebf\u9884\u89c8',
        dayLabel: '\u7b2c1\u5929', morning: '\u4e0a\u5348', afternoon: '\u4e0b\u5348', evening: '\u665a\u4e0a',
        morningTitle: '\u6807\u5fd7\u6027\u666f\u70b9 + \u65e9\u9910\u7ad9', afternoonTitle: '\u9884\u7b97\u5408\u7406\u4e14\u8425\u4e1a\u65f6\u95f4\u771f\u5b9e\u7684\u6d3b\u52a8',
        eveningTitle: '\u6d3b\u52a8\u5339\u914d\u6216\u5f53\u5730\u9910\u996e\u63a8\u8350'
      },
      stats: { aria: 'Waynest\u5e73\u53f0\u7edf\u8ba1', activeTravelers: '\u6d3b\u8dc3\u65c5\u884c\u8005', livePlaces: '\u5b9e\u65f6\u5730\u70b9', countries: '\u56fd\u5bb6', sharedRoutes: '\u5df2\u5206\u4eab\u7684\u8def\u7ebf' },
      standout: { eyebrow: '\u4e3a\u4f55\u8131\u9896\u800c\u51fa', title: '\u65e8\u5728\u4e0e\u666e\u901a\u65c5\u884c\u5de5\u5177\u622a\u7136\u4e0d\u540c', description: '\u4e00\u76ee\u4e86\u7136\u7684\u4ef7\u503c\uff1aAI\u89c4\u5212\u3001\u5b9e\u65f6\u76ee\u7684\u5730\u6570\u636e\u4ee5\u53ca\u4f7f\u8def\u7ebf\u53ef\u91cd\u590d\u4f7f\u7528\u7684\u793e\u4ea4\u5c42\u3002' },
      differentiators: {
        realInputs: { title: '\u57fa\u4e8e\u771f\u5b9e\u6570\u636e\u89c4\u5212\u7684AI', description: 'Waynest\u6839\u636e\u4f60\u7684\u76ee\u7684\u5730\u3001\u56e2\u961f\u89c4\u6a21\u3001\u9884\u7b97\u3001\u5174\u8da3\u3001\u5730\u70b9\u4ef7\u683c\u548c\u8425\u4e1a\u65f6\u95f4\u6784\u5efa\u8def\u7ebf\u3002' },
        firstClick: { title: '\u4ece\u7b2c\u4e00\u6b21\u70b9\u51fb\u5373\u53ef\u4f7f\u7528', description: '\u8bbf\u5ba2\u65e0\u9700\u590d\u6742\u8bbe\u7f6e\u5373\u53ef\u7acb\u5373\u63a2\u7d22\u3001\u751f\u6210\u884c\u7a0b\u5e76\u7406\u89e3\u6d41\u7a0b\u3002' },
        socialTravel: { title: '\u65c5\u884c\u5373\u793e\u4ea4\u4f53\u9a8c', description: '\u5c06\u79c1\u4eba\u89c4\u5212\u8f6c\u5316\u4e3a\u53ef\u5206\u4eab\u7684\u8def\u7ebf\uff0c\u5176\u4ed6\u65c5\u884c\u8005\u53ef\u4ee5\u67e5\u770b\u3001\u590d\u5236\u548c\u91cd\u65b0\u7ec4\u5408\u3002' }
      },
      planner: {
        eyebrow: '\u89c4\u5212\u5668\u6d41\u7a0b', title: '\u7b80\u5355\u5230\u4efb\u4f55\u4eba\u90fd\u53ef\u4ee5\u4f7f\u7528', link: '\u6253\u5f00\u89c4\u5212\u5668',
        setDestination: { title: '\u8bbe\u7f6e\u76ee\u7684\u5730', description: '\u9009\u62e9\u56fd\u5bb6\u3001\u57ce\u5e02\u3001\u884c\u7a0b\u5929\u6570\u548c\u65c5\u884c\u4eba\u6570\u3002' },
        giveContext: { title: '\u4e3aAI\u63d0\u4f9b\u80cc\u666f\u4fe1\u606f', description: '\u6dfb\u52a0\u9884\u7b97\u3001\u8d27\u5e01\u548c\u5174\u8da3\uff0c\u4f7f\u8def\u7ebf\u7b26\u5408\u4f60\u7684\u98ce\u683c\u3002' },
        reviewRoute: { title: '\u67e5\u770b\u771f\u5b9e\u8def\u7ebf', description: '\u83b7\u53d6\u57fa\u4e8e\u5730\u70b9\u3001\u8d39\u7528\u3001\u65f6\u95f4\u548c\u6d3b\u52a8\u7684\u9010\u65e5\u884c\u7a0b\u5b89\u6392\u3002' }
      },
      featured: { eyebrow: '\u7cbe\u9009\u5730\u70b9', title: '\u7528\u6237\u53ef\u4ee5\u7acb\u5373\u63a2\u7d22\u7684\u771f\u5b9e\u76ee\u7684\u5730', link: '\u63a2\u7d22\u6240\u6709\u5730\u70b9', loading: '\u6b63\u5728\u52a0\u8f7d\u76ee\u7684\u5730\u4eae\u70b9...', empty: '\u6682\u65e0\u7cbe\u9009\u5730\u70b9\u3002', fallbackDescription: '\u63a2\u7d22\u4e00\u4e2a\u53ef\u4ee5\u76f4\u63a5\u7eb3\u5165\u4e0b\u4e00\u6761AI\u8def\u7ebf\u7684\u76ee\u7684\u5730\u3002' },
      events: { eyebrow: '\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8', title: '\u89c4\u5212\u5668\u53ef\u4ee5\u878d\u5165\u8def\u7ebf\u7684\u7cbe\u5f69\u65f6\u523b', loading: '\u6b63\u5728\u52a0\u8f7d\u6d3b\u52a8...', empty: '\u6682\u65e0\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8\u3002' },
      shared: { eyebrow: '\u5df2\u5206\u4eab\u7684\u884c\u7a0b', title: '\u8bc1\u660eWaynest\u8def\u7ebf\u53ef\u4ee5\u8d85\u8d8a\u5355\u4e2a\u7528\u6237\u800c\u5b58\u5728', loading: '\u6b63\u5728\u52a0\u8f7d\u5171\u4eab\u8def\u7ebf...', empty: '\u6682\u65e0\u516c\u5f00\u8def\u7ebf\u3002', sharedTravelerRoute: '\u65c5\u884c\u8005\u5171\u4eab\u8def\u7ebf', publishedBy: '\u7531@{{username}}\u53d1\u5e03', publishedTravelRoute: '\u5df2\u53d1\u5e03\u7684\u65c5\u884c\u8def\u7ebf' },
      cta: { eyebrow: '\u51c6\u5907\u5f00\u59cb\uff1f', title: '\u4eceAI\u89c4\u5212\u5668\u5f00\u59cb\uff0c\u7136\u540e\u9010\u6b65\u4f53\u9a8c\u5b8c\u6574\u7684Waynest\u3002', description: '\u4ee5\u8bbf\u5ba2\u8eab\u4efd\u751f\u6210\u8def\u7ebf\uff0c\u767b\u5f55\u4ee5\u4fdd\u5b58\u5b83\uff0c\u5e76\u5728\u6b64\u7ed3\u5408\u4e86\u53ef\u7528\u6027\u3001\u53d1\u73b0\u548c\u793e\u4ea4\u65c5\u884c\u7684\u7cfb\u7edf\u4e0a\u7ee7\u7eed\u6784\u5efa\u3002', primary: '\u5c1d\u8bd5\u89c4\u5212\u5668', secondary: '\u521b\u5efa\u8d26\u6237', ghost: '\u767b\u5f55' },
      openDetails: '\u6253\u5f00\u8be6\u60c5'
    },
    login: {
      welcomeBack: '\u6b22\u8fce\u56de\u6765', signIn: '\u767b\u5f55\u4f60\u7684\u8d26\u6237',
      emailOrUsername: '\u90ae\u7bb1\u6216\u7528\u6237\u540d', enterEmailOrUsername: '\u8f93\u5165\u4f60\u7684\u90ae\u7bb1\u6216\u7528\u6237\u540d',
      password: '\u5bc6\u7801', enterPassword: '\u8f93\u5165\u4f60\u7684\u5bc6\u7801', loginButton: '\u767b\u5f55',
      loggingIn: '\u6b63\u5728\u767b\u5f55...', loginFailed: '\u767b\u5f55\u5931\u8d25\u3002\u8bf7\u91cd\u8bd5\u3002',
      showPassword: '\u663e\u793a\u5bc6\u7801', hidePassword: '\u9690\u85cf\u5bc6\u7801',
      chooseAccountTitle: '\u4f60\u60f3\u5982\u4f55\u7ee7\u7eed\uff1f', chooseAccountSubtitle: '\u4ee5\u65c5\u884c\u8005\u8eab\u4efd\u4f7f\u7528Waynest\u6216\u6253\u5f00\u4f60\u7684\u5546\u4e1a\u5de5\u5177\u3002',
      choosePersonal: '\u4e2a\u4eba\u8d26\u6237', choosePersonalHint: '\u9996\u9875\u4fe1\u606f\u6d41\u3001\u884c\u7a0b\u3001\u9884\u8ba2\u548c\u65c5\u884c\u8005\u4e2a\u4eba\u8d44\u6599\u3002',
      chooseProvider: '\u670d\u52a1\u5546\u9762\u677f', chooseProviderHint: '\u7ba1\u7406\u4f60\u7684\u4e1a\u52a1\u3001\u5217\u8868\u548c\u670d\u52a1\u5546\u9884\u8ba2\u3002'
    },
    contact: {
      hero: { title: '\u8054\u7cfb\u6211\u4eec', subtitle: '\u6709\u95ee\u9898\u6216\u53cd\u9988\uff1f\u6211\u4eec\u5f88\u4e50\u610f\u542c\u53d6\u4f60\u7684\u610f\u89c1\uff01' },
      contactInformation: { title: '\u8054\u7cfb\u4fe1\u606f', email: '\u90ae\u7bb1', emailValue: 'support@waynest.com', responseTime: '\u56de\u590d\u65f6\u95f4', responseTimeValue: '24\u5c0f\u65f6\u5185', officeHours: '\u529e\u516c\u65f6\u95f4', officeHoursValue: '\u5468\u4e00\u81f3\u5468\u4e94\uff1a\u4e0a\u53489:00 - \u4e0b\u53486:00' },
      followUs: { title: '\u5173\u6ce8\u6211\u4eec', twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' },
      form: {
        title: '\u7ed9\u6211\u4eec\u53d1\u9001\u6d88\u606f', name: '\u59d3\u540d', namePlaceholder: '\u4f60\u7684\u59d3\u540d',
        email: '\u90ae\u7bb1', emailPlaceholder: '\u4f60\u7684\u90ae\u7bb1@example.com', subject: '\u4e3b\u9898', subjectPlaceholder: '\u9009\u62e9\u4e00\u4e2a\u4e3b\u9898',
        subjectOptions: { general: '\u4e00\u822c\u54a8\u8be2', support: '\u6280\u672f\u652f\u6301', feedback: '\u53cd\u9988', partnership: '\u5408\u4f5c', other: '\u5176\u4ed6' },
        message: '\u6d88\u606f', messagePlaceholder: '\u544a\u8bc9\u6211\u4eec\u5982\u4f55\u5e2e\u52a9\u4f60...', sendButton: '\u53d1\u9001\u6d88\u606f', sending: '\u53d1\u9001\u4e2d...', required: '*'
      },
      success: { title: '\u611f\u8c22\u4f60\u8054\u7cfb\u6211\u4eec\uff01', message: '\u6211\u4eec\u5df2\u6536\u5230\u4f60\u7684\u6d88\u606f\uff0c\u5c06\u5c3d\u5feb\u56de\u590d\u4f60\u3002', sendAnother: '\u518d\u53d1\u4e00\u6761\u6d88\u606f' }
    },
    about: {
      hero: { title: '\u5173\u4e8eWaynest', subtitle: '\u4f60\u503c\u5f97\u4fe1\u8d56\u7684\u65c5\u4f34\uff0c\u52a9\u4f60\u53d1\u73b0\u4e16\u754c\u5404\u5730\u7684\u7cbe\u5f69\u76ee\u7684\u5730' },
      mission: { title: '\u6211\u4eec\u7684\u4f7f\u547d', description: '\u5728Waynest\uff0c\u6211\u4eec\u76f8\u4fe1\u65c5\u884c\u5e94\u5f53\u662faccessible\u3001\u9f13\u821e\u4eba\u5fc3\u4e14\u4ee4\u4eba\u96be\u5fd8\u7684\u3002\u6211\u4eec\u7684\u4f7f\u547d\u662f\u5c06\u65c5\u884c\u8005\u4e0e\u4e16\u754c\u4e0a\u6700\u7f8e\u4e3d\u7684\u76ee\u7684\u5730\u8fde\u63a5\u8d77\u6765\uff0c\u5e2e\u52a9\u4ed6\u4eec\u53d1\u73b0\u9690\u85cf\u7684\u5b9d\u85cf\u5e76\u521b\u9020\u6301\u4e45\u7684\u56de\u5fc6\u3002' },
      whatWeOffer: {
        title: '\u6211\u4eec\u7684\u670d\u52a1',
        discoverPlaces: { title: '\u53d1\u73b0\u5730\u70b9', description: '\u63a2\u7d22\u6210\u5343\u4e0a\u4e07\u7684\u76ee\u7684\u5730\uff0c\u4ece\u7e41\u534e\u7684\u57ce\u5e02\u5230\u5b81\u9759\u7684\u81ea\u7136\u5947\u89c2\u3002\u4e3a\u4f60\u7684\u4e0b\u4e00\u6b21\u5192\u9669\u627e\u5230\u5b8c\u7f8e\u5730\u70b9\u3002' },
        expertReviews: { title: '\u4e13\u5bb6\u8bc4\u4ef7', description: '\u9605\u8bfb\u6765\u81ea\u5176\u4ed6\u65c5\u884c\u8005\u7684\u771f\u5b9e\u8bc4\u4ef7\uff0c\u83b7\u53d6\u5173\u4e8e\u6700\u4f73\u6e38\u89c8\u3001\u9910\u996e\u548c\u4f4f\u5bbf\u5730\u70b9\u7684\u5185\u90e8\u5efa\u8bae\u3002' },
        planYourTrip: { title: '\u89c4\u5212\u4f60\u7684\u65c5\u884c', description: '\u5728\u4e00\u4e2a\u5730\u65b9\u4fdd\u5b58\u4f60\u6700\u559c\u6b22\u7684\u76ee\u7684\u5730\u3001\u521b\u5efa\u5fc3\u613f\u5355\u5e76\u89c4\u5212\u5b8c\u7f8e\u7684\u884c\u7a0b\u3002' },
        communityDriven: { title: '\u793e\u533a\u9a71\u52a8', description: '\u52a0\u5165\u4e00\u4e2a\u5145\u6ee1\u70ed\u60c5\u7684\u65c5\u884c\u8005\u793e\u533a\uff0c\u5206\u4eab\u4ed6\u4eec\u7684\u7ecf\u9a8c\u548c\u5efa\u8bae\uff0c\u5e2e\u52a9\u4ed6\u4eba\u63a2\u7d22\u4e16\u754c\u3002' }
      },
      whyChoose: {
        title: '\u4e3a\u4ec0\u4e48\u9009\u62e9Waynest\uff1f',
        comprehensiveDatabase: '\u5168\u9762\u7684\u6570\u636e\u5e93\uff1a', comprehensiveDatabaseDesc: '\u83b7\u53d6\u5168\u7403\u56fd\u5bb6\u3001\u57ce\u5e02\u548c\u5730\u70b9\u7684\u4fe1\u606f\u3002',
        realExperiences: '\u771f\u5b9e\u4f53\u9a8c\uff1a', realExperiencesDesc: '\u4ece\u53bb\u8fc7\u90a3\u91cc\u7684\u771f\u5b9e\u65c5\u884c\u8005\u90a3\u91cc\u83b7\u5f97\u89c1\u89e3\u3002',
        easyPlanning: '\u8f7b\u677e\u89c4\u5212\uff1a', easyPlanningDesc: '\u4f7f\u7528\u6211\u4eec\u76f4\u89c2\u7684\u5de5\u5177\u548c\u529f\u80fd\u7ec4\u7ec7\u4f60\u7684\u65c5\u884c\u8ba1\u5212\u3002',
        alwaysUpdated: '\u6301\u7eed\u66f4\u65b0\uff1a', alwaysUpdatedDesc: '\u6211\u4eec\u7684\u5e73\u53f0\u4e0d\u65ad\u66f4\u65b0\u65b0\u7684\u76ee\u7684\u5730\u548c\u65b0\u9c9c\u5185\u5bb9\u3002'
      },
      ourStory: { title: '\u6211\u4eec\u7684\u6545\u4e8b', paragraph1: 'Waynest\u8bde\u751f\u4e8e\u4e00\u4e2a\u7b80\u5355\u7684\u60f3\u6cd5\uff1a\u8ba9\u65c5\u884c\u89c4\u5212\u66f4\u8f7b\u677e\u3001\u66f4\u6109\u5feb\u3002\u6211\u4eec\u7406\u89e3\u89c4\u5212\u4e00\u6b21\u65c5\u884c\u53ef\u80fd\u4f1a\u8ba9\u4eba\u4e0d\u77e5\u6240\u63aa\uff0c\u56e0\u4e3a\u6709\u592a\u591a\u7684\u9009\u62e9\u548c\u51b3\u5b9a\u3002\u8fd9\u5c31\u662f\u4e3a\u4ec0\u4e48\u6211\u4eec\u521b\u5efa\u4e86\u4e00\u4e2a\u5c06\u6240\u6709\u4f60\u9700\u8981\u7684\u4e1c\u897f\u6c47\u805a\u5728\u4e00\u4e2a\u5730\u65b9\u7684\u5e73\u53f0\u3002', paragraph2: '\u65e0\u8bba\u4f60\u662f\u7ecf\u9a8c\u4e30\u5bcc\u7684\u65c5\u884c\u8005\u8fd8\u662f\u6b63\u5728\u89c4\u5212\u4f60\u7684\u7b2c\u4e00\u6b21\u5192\u9669\uff0cWaynest\u90fd\u80fd\u4ee5\u5168\u65b0\u7684\u65b9\u5f0f\u5e2e\u52a9\u4f60\u53d1\u73b0\u3001\u89c4\u5212\u548c\u4f53\u9a8c\u8fd9\u4e2a\u4e16\u754c\u3002' },
      joinCommunity: { title: '\u52a0\u5165\u6211\u4eec\u7684\u793e\u533a', description: '\u51c6\u5907\u597d\u5f00\u59cb\u4f60\u7684\u4e0b\u4e00\u6b21\u5192\u9669\u4e86\u5417\uff1f\u52a0\u5165\u6210\u5343\u4e0a\u4e07\u4fe1\u4efbWaynest\u7684\u65c5\u884c\u8005\uff0c\u5e2e\u52a9\u4ed6\u4eec\u53d1\u73b0\u7cbe\u5f69\u7684\u76ee\u7684\u5730\u5e76\u521b\u9020\u96be\u5fd8\u7684\u56de\u5fc6\u3002', getStarted: '\u5f00\u59cb\u4f7f\u7528', exploreDestinations: '\u63a2\u7d22\u76ee\u7684\u5730' }
    },
    destinations: {
      hero: { eyebrow: '\u63a2\u7d22\u4e16\u754c', title: '\u53d1\u73b0\u76ee\u7684\u5730', subtitle: '\u63a2\u7d22\u4e16\u754c\u5404\u5730\u4ee4\u4eba\u60ca\u53f9\u7684\u56fd\u5bb6\u548c\u57ce\u5e02', searchPlaceholder: '\u641c\u7d22\u76ee\u7684\u5730\u3001\u57ce\u5e02\u6216\u9996\u90fd...' },
      regions: { all: '\u5168\u90e8', asia: '\u4e9a\u6d32', europe: '\u6b27\u6d32', africa: '\u975e\u6d32', americas: '\u7f8e\u6d32', oceania: '\u5927\u6d0b\u6d32' },
      labels: { capital: '\u9996\u90fd\uff1a', region: '\u5730\u533a\uff1a', cities: '\u57ce\u5e02\uff1a', more: '\u66f4\u591a' },
      filtersNav: '\u6309\u5730\u533a\u7b5b\u9009', flagAlt: '{{country}}\u56fd\u65d7', loading: '\u6b63\u5728\u52a0\u8f7d\u76ee\u7684\u5730...',
      emptyState: '\u672a\u627e\u5230\u76ee\u7684\u5730\u3002\u8bf7\u5c1d\u8bd5\u8c03\u6574\u641c\u7d22\u6216\u7b5b\u9009\u6761\u4ef6\u3002'
    },
    register: {
      title: '\u521b\u5efa\u8d26\u6237', subtitle: '\u6ce8\u518c\u5f00\u59cb\u4f7f\u7528',
      firstName: '\u540d\u5b57', firstNamePlaceholder: '\u8f93\u5165\u4f60\u7684\u540d\u5b57', lastName: '\u59d3\u6c0f', lastNamePlaceholder: '\u8f93\u5165\u4f60\u7684\u59d3\u6c0f',
      email: '\u90ae\u7bb1', emailPlaceholder: '\u8f93\u5165\u4f60\u7684\u90ae\u7bb1', username: '\u7528\u6237\u540d', usernamePlaceholder: '\u9009\u62e9\u4e00\u4e2a\u7528\u6237\u540d',
      password: '\u5bc6\u7801', passwordPlaceholder: '\u8f93\u5165\u4f60\u7684\u5bc6\u7801\uff08\u81f3\u5c118\u4e2a\u5b57\u7b26\uff09',
      confirmPassword: '\u786e\u8ba4\u5bc6\u7801', confirmPasswordPlaceholder: '\u786e\u8ba4\u4f60\u7684\u5bc6\u7801',
      signUp: '\u6ce8\u518c', creatingAccount: '\u6b63\u5728\u521b\u5efa\u8d26\u6237...', alreadyHaveAccount: '\u5df2\u6709\u8d26\u6237\uff1f', signIn: '\u767b\u5f55',
      passwordsDoNotMatch: '\u5bc6\u7801\u4e0d\u5339\u914d', passwordTooShort: '\u5bc6\u7801\u5fc5\u987b\u81f3\u5c118\u4e2a\u5b57\u7b26',
      registrationFailed: '\u6ce8\u518c\u5931\u8d25\u3002\u8bf7\u91cd\u8bd5\u3002', showPassword: '\u663e\u793a\u5bc6\u7801', hidePassword: '\u9690\u85cf\u5bc6\u7801'
    },
    explore: {
      hero: { title: '\u63a2\u7d22\u5730\u70b9', subtitle: '\u53d1\u73b0\u4e16\u754c\u5404\u5730\u7684\u7cbe\u5f69\u76ee\u7684\u5730', searchPlaceholder: '\u641c\u7d22\u5730\u70b9...', googleUnavailable: '\u6b64\u73af\u5883\u4e0bGoogle Places\u641c\u7d22\u4e0d\u53ef\u7528\u3002', description: '\u6b64\u9875\u9762\u4e13\u6ce8\u4e8e\u53d1\u73b0\u3002\u6d4f\u89c8\u76ee\u5f55\u3001\u641c\u7d22\u516c\u5f00\u670d\u52a1\u5546\u3001\u67e5\u770b\u8be6\u60c5\uff0c\u65e0\u793e\u4ea4\u5e72\u6270\u3002' },
      categories: { all: '\u5168\u90e8', restaurant: '\u9910\u5385', cafe: '\u5496\u5561\u9986', attraction: '\u666f\u70b9', museum: '\u535a\u7269\u9986', park: '\u516c\u56ed', historical: '\u5386\u53f2\u8ff9\u5740', events: '\u6d3b\u52a8' },
      search: { title: '\u641c\u7d22\u516c\u5171\u76ee\u5f55', placeholder: '\u641c\u7d22\u670d\u52a1\u5546\u3001\u5730\u70b9\u548c\u6d3b\u52a8...', loading: '\u641c\u7d22\u4e2d...' },
      events: { title: '\u6d3b\u52a8', emptyMessage: '\u76ee\u524d\u6ca1\u6709\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8\u3002\u8bf7\u7a0d\u540e\u518d\u6765\u67e5\u770b\u3002' },
      emptyState: '\u672a\u627e\u5230\u5730\u70b9'
    },
    navbar: {
      home: '\u9996\u9875', explore: '\u63a2\u7d22', search: '\u641c\u7d22', planner: '\u89c4\u5212\u5668', social: '\u793e\u4ea4',
      inbox: '\u6536\u4ef6\u7bb1', notifications: '\u901a\u77e5', notificationsMenu: '\u901a\u77e5', notificationsSeeAll: '\u67e5\u770b\u6240\u6709\u901a\u77e5',
      about: '\u5173\u4e8e', contact: '\u8054\u7cfb\u6211\u4eec', login: '\u767b\u5f55', signUp: '\u6ce8\u518c',
      userPanel: '\u7528\u6237\u9762\u677f', adminPanel: '\u7ba1\u7406\u9762\u677f', providerPanel: '\u5546\u4e1a\u8d26\u6237',
      businessAccount: '\u5546\u4e1a\u8d26\u6237', logout: '\u9000\u51fa', welcome: '\u6b22\u8fce',
      dark: '\u6df1\u8272', light: '\u6d45\u8272', language: '\u8bed\u8a00',
      toggleSidebar: '\u5207\u6362\u4fa7\u8fb9\u680f', closeSidebar: '\u5173\u95ed\u4fa7\u8fb9\u680f',
      providerProfileSection: '\u670d\u52a1\u5546\u8d44\u6599', backToFeed: '\u8fd4\u56de\u4fe1\u606f\u6d41', personalAccount: '\u4e2a\u4eba\u8d26\u6237'
    },
    user: {
      sidebar: { dashboard: '\u4eea\u8868\u76d8', profile: '\u4e2a\u4eba\u8d44\u6599', bookings: '\u9884\u8ba2', wishlist: '\u5fc3\u613f\u5355' },
      dashboard: { title: '\u4eea\u8868\u76d8', myBookings: '\u6211\u7684\u9884\u8ba2', wishlist: '\u5fc3\u613f\u5355', myReviews: '\u6211\u7684\u8bc4\u4ef7', profileStatus: '\u8d44\u6599\u72b6\u6001', active: '\u6d3b\u8dc3' },
      wishlist: { title: '\u5fc3\u613f\u5355', empty: '\u4f60\u7684\u5fc3\u613f\u5355\u662f\u7a7a\u7684', emptyAction: '\u5f00\u59cb\u63a2\u7d22\uff01', exploreButton: '\u63a2\u7d22\u5730\u70b9', remove: '\u79fb\u9664', rating: '\u8bc4\u5206' },
      bookings: {
        title: '\u6211\u7684\u9884\u8ba2', empty: '\u6682\u65e0\u9884\u8ba2', emptyAction: '\u63a2\u7d22\u5730\u70b9\u4ee5\u9884\u8ba2\u4f60\u7684\u884c\u7a0b\uff01', exploreButton: '\u63a2\u7d22\u5730\u70b9',
        persons: '\u4eba', cancel: '\u53d6\u6d88',
        status: { pending: '\u5f85\u5904\u7406', confirmed: '\u5df2\u786e\u8ba4', cancelled: '\u5df2\u53d6\u6d88', completed: '\u5df2\u5b8c\u6210' }
      },
      profile: {
        connectionsBack: '\u8fd4\u56de', connectionsBackUser: '\u8fd4\u56de', title: '\u4f60\u7684\u4e2a\u4eba\u8d44\u6599', subtitle: '\u4fdd\u6301\u4f60\u7684\u4e2a\u4eba\u8d44\u6599\u51c6\u786e\u4e14\u6700\u65b0\u3002',
        name: '\u59d3\u540d', email: '\u90ae\u7bb1', phone: '\u7535\u8bdd', saveChanges: '\u4fdd\u5b58\u66f4\u6539', accountCenter: '\u8d26\u6237\u4e2d\u5fc3'
      },
      tripPlanner: { title: 'AI\u65c5\u884c\u89c4\u5212\u5668', planYourTrip: '\u89c4\u5212\u4f60\u7684\u5b8c\u7f8e\u65c5\u884c' }
    },
    provider: {
      sidebar: {
        feed: '\u4fe1\u606f\u6d41', dashboard: '\u4eea\u8868\u76d8', profile: '\u8d44\u6599', createPost: '\u521b\u5efa\u5e16\u5b50',
        sectionOverview: '\u6982\u89c8', sectionOperations: '\u8fd0\u8425', sectionPresence: '\u5c55\u793a', sectionAccount: '\u8d26\u6237',
        publicPage: '\u516c\u5f00\u9875\u9762', businessSettings: '\u4e1a\u52a1\u8bbe\u7f6e', myPlaces: '\u6211\u7684\u5730\u70b9',
        events: '\u6d3b\u52a8', bookings: '\u9884\u8ba2', reviews: '\u5ba2\u6237\u8bc4\u4ef7'
      },
      createPost: { title: '\u521b\u5efa\u5e16\u5b50', subtitle: '\u4e0e\u4f60\u7684\u5ba2\u6237\u5206\u4eab\u66f4\u65b0\u3001\u4f18\u60e0\u6216\u516c\u544a\u3002' },
      business: {
        loadingTitle: '\u52a0\u8f7d\u4e2d\u2026', sharePage: '\u5206\u4eab\u9875\u9762', linkCopied: '\u94fe\u63a5\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f', linkCopyFailed: '\u65e0\u6cd5\u590d\u5236\u94fe\u63a5',
        statsLabel: '\u4e1a\u52a1\u7edf\u8ba1', statPlaces: '\u5730\u70b9', statRating: '\u5e73\u5747\u8bc4\u5206', statReviews: '\u53cd\u9988', statBookings: '\u9884\u8ba2',
        tabsAria: '\u4e1a\u52a1\u9875\u9762\u677f\u5757', tabOverview: '\u6982\u89c8', tabServices: '\u5730\u70b9', tabEvents: '\u6d3b\u52a8', tabReviews: '\u5ba2\u6237\u53cd\u9988',
        placesTitle: '\u5730\u70b9', noPlaces: '\u6682\u65e0\u5730\u70b9\u5217\u8868\u3002', eventsTitle: '\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8', noEvents: '\u6682\u65e0\u8ba1\u5212\u4e2d\u7684\u6d3b\u52a8\u3002',
        reviewsTitle: '\u5ba2\u6237\u53cd\u9988', guestFeedbackTitle: '\u5ba2\u6237\u53cd\u9988', guestFeedbackSub: '\u8bbf\u5ba2\u5728\u4f53\u9a8c\u540e\u7559\u4e0b\u7684\u8bc4\u5206\u548c\u8bc4\u8bba\u3002',
        feedbackStripTitle: '\u5ba2\u6237\u53cd\u9988', feedbackStripHint: '\u6253\u5f00\u5b8c\u6574\u7684\u8bc4\u5206\u548c\u8bc4\u8bba\u5217\u8868',
        feedbackStripEmpty: '\u6682\u65e0\u8bc4\u5206 \u2014 \u5ba2\u6237\u8bbf\u95ee\u540e\u663e\u793a', feedbackCountShort: '\u8bc4\u4ef7', feedbackStripAria: '\u5ba2\u6237\u53cd\u9988',
        mapTitle: '\u4f4d\u7f6e', mapSub: '\u5730\u56fe\u4e0a\u7684\u670d\u52a1\u533a\u57df', placesSub: '\u6b64\u5546\u5bb6\u7684\u573a\u5730\u548c\u5217\u8868',
        eventsSub: '\u8ba1\u5212\u4e2d\u7684\u4f53\u9a8c\u548c\u65e5\u671f', reviewsSub: '\u6765\u81ea\u5ba2\u6237\u7684\u53cd\u9988', postsSub: '\u6b64\u5546\u5bb6\u53d1\u5e03\u7684\u66f4\u65b0',
        viewMap: '\u5730\u56fe', bookNow: '\u9884\u8ba2', bookNowComingSoon: '\u9884\u8ba2\uff08\u5373\u5c06\u63a8\u51fa\uff09'
      },
      common: { active: '\u6d3b\u8dc3', inactive: '\u4e0d\u6d3b\u8dc3', notSetup: '\u4f60\u7684\u670d\u52a1\u5546\u8d26\u6237\u5c1a\u672a\u8bbe\u7f6e\u3002\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002' },
      businessFeed: {
        titleFallback: '\u4e1a\u52a1', atAGlance: '\u6982\u89c8', heroLead: '\u5728\u4e00\u4e2a\u5730\u65b9\u7ba1\u7406\u5e16\u5b50\u3001\u9884\u8ba2\u548c\u4f60\u7684\u516c\u5f00\u5f62\u8c61\u3002',
        heroSettings: '\u4e1a\u52a1\u8bbe\u7f6e', separationNotice: '\u4f60\u7684\u5546\u4e1a\u8d26\u6237\u4e0e\u4e2a\u4eba\u8d44\u6599\u662f\u5206\u5f00\u7684\u3002\u6b64\u5904\u7684\u6d3b\u52a8\u4ec5\u9002\u7528\u4e8e\u4f60\u7684\u4e1a\u52a1\u3002',
        feedTitle: '\u4e1a\u52a1\u4fe1\u606f\u6d41', peopleTitle: '\u53d7\u4f17\u4e0e\u4eba\u5458',
        peopleBody: '\u4f60\u7684\u516c\u5f00\u9875\u9762\u663e\u793a\u5173\u6ce8\u8005\u3002\u4e2a\u4eba\u804a\u5929\u548c\u670b\u53cb\u5c06\u4fdd\u7559\u5728\u4f60\u4e2a\u4eba\u8d26\u6237\u4e0b\u7684\u6d88\u606f\u4e2d\u3002\u6b64\u4e1a\u52a1\u7684\u56e2\u961f\u8bbf\u95ee\u6743\u9650\u7a0d\u540e\u5c06\u5728\u6b64\u5904\u63d0\u4f9b\u3002',
        viewPublicPage: '\u6253\u5f00\u516c\u5f00\u4e1a\u52a1\u9875\u9762', personalMessages: '\u4e2a\u4eba\u6d88\u606f\u4e0e\u670b\u53cb', teamComingSoon: '\u9080\u8bf7\u56e2\u961f\u6210\u5458\u5171\u540c\u7ba1\u7406\u6b64\u4e1a\u52a1\u5373\u5c06\u63a8\u51fa\u3002',
        loadError: '\u52a0\u8f7d\u4e1a\u52a1\u4fe1\u606f\u6d41\u5931\u8d25', noPosts: '\u4f60\u7684\u4e1a\u52a1\u4fe1\u606f\u6d41\u4e2d\u6682\u65e0\u5e16\u5b50\u3002',
        workspaceEyebrow: '\u4e1a\u52a1\u5de5\u4f5c\u533a', trustVerified: '\u5df2\u9a8c\u8bc1\u7684\u4e1a\u52a1', trustPending: '\u9a8c\u8bc1\u8fdb\u884c\u4e2d', trustAttention: '\u8d26\u6237\u9700\u8981\u64cd\u4f5c',
        opsNav: '\u8fd0\u8425', opsPlaces: '\u5217\u8868', opsEvents: '\u6d3b\u52a8', opsBookings: '\u9884\u8ba2', opsReviews: '\u5ba2\u6237\u8bc4\u4ef7',
        emptyFeedTitle: '\u5f00\u59cb\u63a5\u89e6\u5ba2\u6237',
        noPostsRich: '\u4f60\u4ee5\u6b64\u4e1a\u52a1\u8eab\u4efd\u53d1\u5e03\u7684\u5e16\u5b50\u5c06\u51fa\u73b0\u5728\u6b64\u5904\u548c\u4f60\u7684\u516c\u5f00\u9875\u9762\u4e0a\u3002\u5728\u4e00\u4e2a\u5730\u65b9\u5206\u4eab\u66f4\u65b0\u3001\u7167\u7247\u548c\u4f18\u60e0\u3002',
        ctaCreatePost: '\u521b\u5efa\u4e1a\u52a1\u5e16\u5b50', ctaAddPlace: '\u7ba1\u7406\u5217\u8868',
        quickNav: '\u4e1a\u52a1\u5feb\u6377\u65b9\u5f0f', quickPlaces: '\u5730\u70b9', quickBookings: '\u9884\u8ba2', quickSettings: '\u8bbe\u7f6e',
        metricMeta: { places: '\u4e0e\u4f60\u7684\u4e1a\u52a1\u5173\u8054\u7684\u5730\u70b9', bookings: '\u6240\u6709\u5217\u8868\u7684\u9884\u8ba2', reviews: '\u5ba2\u6237\u8bc4\u4ef7', rating: '\u6240\u6709\u8bc4\u4ef7\u7684\u5e73\u5747\u503c' }
      },
      dashboard: {
        defaultTitle: '\u670d\u52a1\u5546\u4eea\u8868\u76d8',
        metrics: { totalPlaces: '\u5730\u70b9\u603b\u6570', totalBookings: '\u9884\u8ba2\u603b\u6570', totalReviews: '\u8bc4\u4ef7\u603b\u6570', averageRating: '\u5e73\u5747\u8bc4\u5206' },
        actions: { managePlaces: '\u7ba1\u7406\u5730\u70b9', viewBookings: '\u67e5\u770b\u9884\u8ba2', profile: '\u670d\u52a1\u5546\u8d44\u6599' },
        feedback: { loadError: '\u52a0\u8f7d\u670d\u52a1\u5546\u4eea\u8868\u76d8\u5931\u8d25' }
      },
      places: {
        title: '\u6211\u7684\u5730\u70b9', empty: '\u672a\u627e\u5230\u4e0e\u4f60\u670d\u52a1\u5546\u8d26\u6237\u76f8\u5173\u7684\u5730\u70b9\u3002', add: '\u6dfb\u52a0\u5730\u70b9', edit: '\u7f16\u8f91', save: '\u4fdd\u5b58',
        modalCreate: '\u6dfb\u52a0\u5730\u70b9', modalEdit: '\u7f16\u8f91\u5730\u70b9', typeAndRating: '{{type}} \u00b7 {{rating}} \u2605',
        table: { image: '', name: '\u540d\u79f0', type: '\u7c7b\u578b', city: '\u57ce\u5e02', rating: '\u8bc4\u5206', active: '\u72b6\u6001', actions: '\u64cd\u4f5c' },
        fields: { name: '\u540d\u79f0', description: '\u63cf\u8ff0', type: '\u7c7b\u578b', city: '\u57ce\u5e02', latitude: '\u7eac\u5ea6', longitude: '\u7ecf\u5ea6', slug: '\u6807\u8bc6\uff08\u53ef\u9009\uff09', active: '\u6d3b\u8dc3' },
        actions: { editPlaces: '\u7f16\u8f91\u5730\u70b9', editPlace: '\u7f16\u8f91' },
        feedback: { loadError: '\u52a0\u8f7d\u5730\u70b9\u5931\u8d25' }
      },
      events: {
        title: '\u6d3b\u52a8', add: '\u65b0\u5efa\u6d3b\u52a8', edit: '\u7f16\u8f91', save: '\u4fdd\u5b58', modalCreate: '\u521b\u5efa\u6d3b\u52a8', modalEdit: '\u7f16\u8f91\u6d3b\u52a8',
        needVenue: '\u8bf7\u5148\u521b\u5efa\u4e00\u4e2a\u5730\u70b9\u6765\u4e3e\u529e\u6d3b\u52a8\u3002',
        columns: { title: '\u6807\u9898', venue: '\u573a\u5730', start: '\u5f00\u59cb', price: '\u4ef7\u683c', active: '\u6d3b\u8dc3', actions: '\u64cd\u4f5c' },
        fields: { title: '\u6807\u9898', description: '\u63cf\u8ff0', venue: '\u573a\u5730\uff08\u5730\u70b9\uff09', start: '\u5f00\u59cb', end: '\u7ed3\u675f', tickets: '\u53ef\u7528\u95e8\u7968', price: '\u95e8\u7968\u4ef7\u683c', currency: '\u8d27\u5e01', active: '\u5df2\u53d1\u5e03' }
      },
      bookings: {
        title: '\u670d\u52a1\u5546\u9884\u8ba2', filterAll: '\u6240\u6709\u72b6\u6001',
        columns: { place: '\u5730\u70b9', date: '\u9884\u8ba2\u65e5\u671f', persons: '\u5ba2\u6237', total: '\u603b\u8ba1', status: '\u72b6\u6001' },
        status: { pending: '\u5f85\u5904\u7406', confirmed: '\u5df2\u786e\u8ba4', completed: '\u5df2\u5b8c\u6210', cancelled: '\u5df2\u53d6\u6d88' },
        feedback: { loadError: '\u52a0\u8f7d\u9884\u8ba2\u5931\u8d25', statusError: '\u65e0\u6cd5\u66f4\u65b0\u9884\u8ba2\u72b6\u6001' }
      },
      profile: {
        title: '\u670d\u52a1\u5546\u8d44\u6599',
        fields: { displayName: '\u663e\u793a\u540d\u79f0', slug: '\u6807\u8bc6', providerType: '\u670d\u52a1\u5546\u7c7b\u578b', phone: '\u7535\u8bdd', website: '\u7f51\u7ad9' },
        providerTypes: { HOTEL: '\u9152\u5e97', RESTAURANT: '\u9910\u5385', TOUR_PROVIDER: '\u65c5\u6e38\u670d\u52a1\u5546', EVENT_ORGANIZER: '\u6d3b\u52a8\u7ec4\u7ec7\u8005', ACTIVITY_PROVIDER: '\u6d3b\u52a8\u670d\u52a1\u5546' },
        actions: { save: '\u4fdd\u5b58\u66f4\u6539' },
        validation: { displayName: '\u8bf7\u8f93\u5165\u663e\u793a\u540d\u79f0', slug: '\u8bf7\u8f93\u5165\u6807\u8bc6', providerType: '\u8bf7\u9009\u62e9\u670d\u52a1\u5546\u7c7b\u578b', phone: '\u8bf7\u8f93\u5165\u7535\u8bdd\u53f7\u7801' },
        feedback: { loadError: '\u52a0\u8f7d\u8d44\u6599\u5931\u8d25', updateSuccess: '\u8d44\u6599\u66f4\u65b0\u6210\u529f', updateError: '\u66f4\u65b0\u8d44\u6599\u5931\u8d25' }
      },
      apply: {
        steps: { business: '\u4e1a\u52a1', contact: '\u8054\u7cfb', review: '\u5ba1\u6838' },
        stepBusinessTitle: '\u4e1a\u52a1\u8be6\u60c5', stepContactTitle: '\u8054\u7cfb\u4e0e\u7c7b\u578b', stepReviewTitle: '\u5ba1\u6838\u4e0e\u63d0\u4ea4',
        highlights: {
          businessBasics: { title: '\u6240\u6709\u4e1a\u52a1\u57fa\u672c\u4fe1\u606f', text: '\u540d\u79f0\u3001\u63cf\u8ff0\u3001\u4f4d\u7f6e\u3001\u7a0e\u52a1\u8be6\u60c5\u548c\u5206\u7c7b\uff0c\u6d41\u7a0b\u7b80\u6d01\u6e05\u6670\u3002' },
          deviceImages: { title: '\u6765\u81ea\u8bbe\u5907\u56fe\u7247', text: '\u76f4\u63a5\u4e0a\u4f20\u4f60\u7684Logo\u548c\u5c01\u9762\u7167\u7247\uff0c\u5373\u65f6\u9884\u89c8\u3002' },
          ownerFirst: { title: '\u6240\u6709\u8005\u4f18\u5148\u8bbf\u95ee', text: '\u4f60\u7684\u8d26\u6237\u5c06\u6210\u4e3a\u4e1a\u52a1\u6240\u6709\u8005\uff0c\u4e4b\u540e\u53ef\u4ee5\u6dfb\u52a0\u56e2\u961f\u6210\u5458\u3002' }
        },
        next: '\u4e0b\u4e00\u6b65', back: '\u8fd4\u56de', successTitle: '\u7533\u8bf7\u5df2\u6536\u5230', successBody: '\u8c22\u8c22\u3002\u4f60\u7684\u7533\u8bf7\u6b63\u5728\u5ba1\u6838\u4e2d\u3002\u6211\u4eec\u5c06\u5728\u505a\u51fa\u51b3\u5b9a\u65f6\u901a\u77e5\u4f60\u3002', goHome: '\u8fd4\u56de\u9996\u9875'
      }
    },
    admin: {
      dashboard: { title: '\u7ba1\u7406\u4eea\u8868\u76d8', totalUsers: '\u7528\u6237\u603b\u6570', totalProviders: '\u670d\u52a1\u5546\u603b\u6570', totalPlaces: '\u5730\u70b9\u603b\u6570', totalReviews: '\u8bc4\u4ef7\u603b\u6570', failedToLoadStats: '\u52a0\u8f7d\u7edf\u8ba1\u4fe1\u606f\u5931\u8d25' },
      common: {
        actions: '\u64cd\u4f5c', edit: '\u7f16\u8f91', delete: '\u5220\u9664', add: '\u6dfb\u52a0', save: '\u4fdd\u5b58', cancel: '\u53d6\u6d88', loading: '\u52a0\u8f7d\u4e2d...',
        totalItems: '\u603b\u8ba1', items: '\u9879\u76ee', pleaseInput: '\u8bf7\u8f93\u5165', failedToSubmit: '\u63d0\u4ea4\u8868\u5355\u5931\u8d25',
        confirmDelete: '\u786e\u8ba4\u5220\u9664', deleteConfirmMessage: '\u786e\u5b9a\u8981\u5220\u9664\u6b64\u9879\u76ee\u5417\uff1f\u6b64\u64cd\u4f5c\u65e0\u6cd5\u64a4\u9500\u3002',
        deleteButton: '\u5220\u9664', createdSuccessfully: '\u521b\u5efa\u6210\u529f', updatedSuccessfully: '\u66f4\u65b0\u6210\u529f', deletedSuccessfully: '\u5220\u9664\u6210\u529f',
        entityCreatedSuccessfully: '{{entity}}\u521b\u5efa\u6210\u529f', entityUpdatedSuccessfully: '{{entity}}\u66f4\u65b0\u6210\u529f', entityDeletedSuccessfully: '{{entity}}\u5220\u9664\u6210\u529f',
        failedToLoad: '\u52a0\u8f7d\u5931\u8d25', failedToSave: '\u4fdd\u5b58\u5931\u8d25', failedToDelete: '\u5220\u9664\u5931\u8d25', yes: '\u662f', no: '\u5426'
      },
      sidebar: {
        dashboard: '\u4eea\u8868\u76d8', users: '\u7528\u6237', providers: '\u670d\u52a1\u5546', places: '\u5730\u70b9', countries: '\u56fd\u5bb6', cities: '\u57ce\u5e02',
        currencies: '\u8d27\u5e01', tags: '\u6807\u7b7e', events: '\u6d3b\u52a8', reviews: '\u8bc4\u4ef7', placePricing: '\u5730\u70b9\u5b9a\u4ef7',
        openingHours: '\u8425\u4e1a\u65f6\u95f4', providerMembership: '\u670d\u52a1\u5546\u4f1a\u5458', devices: '\u8bbe\u5907'
      },
      users: { title: '\u7528\u6237\u7ba1\u7406', addUser: '\u6dfb\u52a0\u7528\u6237', editUser: '\u7f16\u8f91\u7528\u6237', deleteUser: '\u5220\u9664\u7528\u6237', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u7528\u6237', firstName: '\u540d\u5b57', lastName: '\u59d3\u6c0f', email: '\u90ae\u7bb1', username: '\u7528\u6237\u540d', password: '\u5bc6\u7801', role: '\u89d2\u8272', phone: '\u7535\u8bdd', status: '\u72b6\u6001', createdAt: '\u521b\u5efa\u65f6\u95f4' },
      providers: { title: '\u670d\u52a1\u5546\u7ba1\u7406', addProvider: '\u6dfb\u52a0\u670d\u52a1\u5546', editProvider: '\u7f16\u8f91\u670d\u52a1\u5546', deleteProvider: '\u5220\u9664\u670d\u52a1\u5546', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u670d\u52a1\u5546', displayName: '\u663e\u793a\u540d\u79f0', providerType: '\u670d\u52a1\u5546\u7c7b\u578b', website: '\u7f51\u7ad9', verificationStatus: '\u9a8c\u8bc1\u72b6\u6001' },
      places: { title: '\u5730\u70b9\u7ba1\u7406', addPlace: '\u6dfb\u52a0\u5730\u70b9', editPlace: '\u7f16\u8f91\u5730\u70b9', deletePlace: '\u5220\u9664\u5730\u70b9', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u5730\u70b9', name: '\u540d\u79f0', slug: '\u6807\u8bc6', description: '\u63cf\u8ff0', type: '\u7c7b\u578b', city: '\u57ce\u5e02', latitude: '\u7eac\u5ea6', longitude: '\u7ecf\u5ea6', ratingAverage: '\u5e73\u5747\u8bc4\u5206', ratingCount: '\u8bc4\u5206\u6570\u91cf', isActive: '\u6d3b\u8dc3', isVerified: '\u5df2\u9a8c\u8bc1' },
      countries: { title: '\u56fd\u5bb6\u7ba1\u7406', addCountry: '\u6dfb\u52a0\u56fd\u5bb6', editCountry: '\u7f16\u8f91\u56fd\u5bb6', deleteCountry: '\u5220\u9664\u56fd\u5bb6', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u56fd\u5bb6', nativeName: '\u5f53\u5730\u540d\u79f0', alpha2: 'Alpha 2', alpha3: 'Alpha 3', numeric: '\u6570\u5b57\u4ee3\u7801' },
      cities: { title: '\u57ce\u5e02\u7ba1\u7406', addCity: '\u6dfb\u52a0\u57ce\u5e02', editCity: '\u7f16\u8f91\u57ce\u5e02', deleteCity: '\u5220\u9664\u57ce\u5e02', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u57ce\u5e02', stateName: '\u5dde/\u7701\u540d\u79f0', population: '\u4eba\u53e3' },
      currencies: { title: '\u8d27\u5e01\u7ba1\u7406', addCurrency: '\u6dfb\u52a0\u8d27\u5e01', editCurrency: '\u7f16\u8f91\u8d27\u5e01', deleteCurrency: '\u5220\u9664\u8d27\u5e01', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u8d27\u5e01', code: '\u4ee3\u7801', fractionSize: '\u5c0f\u6570\u4f4d\u6570' },
      tags: { title: '\u6807\u7b7e\u7ba1\u7406', addTag: '\u6dfb\u52a0\u6807\u7b7e', editTag: '\u7f16\u8f91\u6807\u7b7e', deleteTag: '\u5220\u9664\u6807\u7b7e', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u6807\u7b7e' },
      events: { title: '\u6d3b\u52a8\u7ba1\u7406', addEvent: '\u6dfb\u52a0\u6d3b\u52a8', editEvent: '\u7f16\u8f91\u6d3b\u52a8', deleteEvent: '\u5220\u9664\u6d3b\u52a8', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u6d3b\u52a8', titleField: '\u6807\u9898', venue: '\u573a\u5730', startDate: '\u5f00\u59cb\u65e5\u671f', endDate: '\u7ed3\u675f\u65e5\u671f', availableTickets: '\u53ef\u7528\u95e8\u7968', ticketPrice: '\u95e8\u7968\u4ef7\u683c', currencyCode: '\u8d27\u5e01\u4ee3\u7801' },
      reviews: { title: '\u8bc4\u4ef7\u7ba1\u7406', addReview: '\u6dfb\u52a0\u8bc4\u4ef7', editReview: '\u7f16\u8f91\u8bc4\u4ef7', deleteReview: '\u5220\u9664\u8bc4\u4ef7', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u8bc4\u4ef7' },
      placePricing: { title: '\u5730\u70b9\u5b9a\u4ef7\u7ba1\u7406', addPlacePricing: '\u6dfb\u52a0\u5730\u70b9\u5b9a\u4ef7', editPlacePricing: '\u7f16\u8f91\u5730\u70b9\u5b9a\u4ef7', deletePlacePricing: '\u5220\u9664\u5730\u70b9\u5b9a\u4ef7', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u5730\u70b9\u5b9a\u4ef7' },
      placeOpeningHours: {
        title: '\u8425\u4e1a\u65f6\u95f4\u7ba1\u7406', addPlaceOpeningHours: '\u6dfb\u52a0\u5165\u8425\u4e1a\u65f6\u95f4', editPlaceOpeningHours: '\u7f16\u8f91\u8425\u4e1a\u65f6\u95f4', deletePlaceOpeningHours: '\u5220\u9664\u8425\u4e1a\u65f6\u95f4',
        deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u6b64\u8425\u4e1a\u65f6\u95f4', dayOfWeek: '\u661f\u671f', openTime: '\u5f00\u95e8\u65f6\u95f4', closeTime: '\u5173\u95e8\u65f6\u95f4',
        days: { sunday: '\u661f\u671f\u65e5', monday: '\u661f\u671f\u4e00', tuesday: '\u661f\u671f\u4e8c', wednesday: '\u661f\u671f\u4e09', thursday: '\u661f\u671f\u56db', friday: '\u661f\u671f\u4e94', saturday: '\u661f\u671f\u516d' }
      },
      providerMembership: { title: '\u670d\u52a1\u5546\u4f1a\u5458\u7ba1\u7406', addProviderMembership: '\u6dfb\u52a0\u4f1a\u5458', editProviderMembership: '\u7f16\u8f91\u4f1a\u5458', deleteProviderMembership: '\u5220\u9664\u4f1a\u5458', deleteConfirm: '\u786e\u5b9a\u8981\u5220\u9664\u6b64\u4f1a\u5458', providerRole: '\u670d\u52a1\u5546\u89d2\u8272' }
    },
    languages: { en: '\u82f1\u8bed', ar: '\u963f\u62c9\u4f2f\u8bed', ru: '\u4fc4\u8bed', fr: '\u6cd5\u8bed', tr: '\u571f\u8033\u5176\u8bed', es: '\u897f\u73ed\u7259\u8bed', de: '\u5fb7\u8bed', zh: '\u4e2d\u6587', pt: '\u8461\u8404\u7259\u8bed' },
    search: {
      label: '\u641c\u7d22', placeholder: '\u4eba\u3001\u5730\u70b9\u3001\u4f01\u4e1a\u2026', placeholderGuest: '\u670d\u52a1\u5546\u3001\u5730\u70b9\u3001\u6d3b\u52a8\u2026',
      submit: '\u641c\u7d22', failed: '\u641c\u7d22\u5931\u8d25', resultsFor: '\u201c{{q}}\u201d\u7684\u641c\u7d22\u7ed3\u679c',
      emptyTitle: '\u641c\u7d22', useBar: '\u4f7f\u7528\u6b64\u9875\u9762\u4e0a\u7684\u641c\u7d22\u6846\u3002',
      typeToSearch: '\u5728\u4e0a\u9762\u8f93\u5165\u4ee5\u641c\u7d22\u4eba\u3001\u670d\u52a1\u5546\u3001\u5730\u70b9\u548c\u6d3b\u52a8\u3002',
      noResults: '\u6682\u65e0\u5339\u914d\u7ed3\u679c\u3002', planFromHere: '\u4ece\u8fd9\u91cc\u89c4\u5212',
      planNeedsCity: '\u9009\u62e9\u4e00\u4e2a\u6709\u57ce\u5e02\u7684\u5730\u5740\u6765\u4ece\u8fd9\u91cc\u89c4\u5212\u3002',
      publicTripsTitle: '\u6765\u81ea\u65c5\u884c\u8005\u7684\u516c\u5f00\u884c\u7a0b', publicTripsEmpty: '\u6682\u65e0\u516c\u5f00\u884c\u7a0b\u3002\u5206\u4eab\u8ba1\u5212\u540e\u53ef\u5728\u6b64\u5904\u67e5\u770b\u3002',
      publicTripsLoadFailed: '\u65e0\u6cd5\u52a0\u8f7d\u516c\u5f00\u884c\u7a0b\u3002', publicTripsBy: '\u6765\u81ea@{{username}}'
    },
    friends: { connected: '\u597d\u53cb', requestSent: '\u8bf7\u6c42\u5df2\u53d1\u9001', accept: '\u63a5\u53d7', decline: '\u62d2\u7edd', add: '\u6dfb\u52a0\u597d\u53cb' },
    social: {
      profile: '\u6211\u7684\u5e16\u5b50', settings: '\u8bbe\u7f6e', follow: '\u5173\u6ce8', unfollow: '\u53d6\u6d88\u5173\u6ce8',
      feed: {
        title: '\u793e\u533a\u4fe1\u606f\u6d41', openSearch: '\u641c\u7d22', loading: '\u6b63\u5728\u52a0\u8f7d\u4fe1\u606f\u6d41...', empty: '\u6b64\u4fe1\u606f\u6d41\u4e2d\u6682\u65e0\u5e16\u5b50\u3002',
        traveler: '\u65c5\u884c\u8005', openSharedTrip: '\u6253\u5f00\u5171\u4eab\u884c\u7a0b', loadFailed: '\u52a0\u8f7d\u793e\u4ea4\u4fe1\u606f\u6d41\u5931\u8d25', savedPlansLoadFailed: '\u52a0\u8f7d\u4fdd\u5b58\u7684\u8ba1\u5212\u5931\u8d25',
        loginToPublish: '\u8bf7\u767b\u5f55\u4ee5\u53d1\u5e03', selectPlanFirst: '\u8bf7\u9009\u62e9\u4e00\u4e2a\u4fdd\u5b58\u7684\u8ba1\u5212', published: '\u5e16\u5b50\u5df2\u53d1\u5e03',
        publishedToast: '\u5df2\u53d1\u5e03\uff01', publishFailed: '\u53d1\u5e03\u5931\u8d25', loginFirst: '\u8bf7\u5148\u767b\u5f55', likeUpdated: '\u70b9\u8d5e\u5df2\u66f4\u65b0',
        savedToAccount: '\u5df2\u4fdd\u5b58\u5230\u4f60\u7684\u8d26\u6237', shareCopied: '\u884c\u7a0b\u94fe\u63a5\u5df2\u590d\u5236', shareUnavailable: '\u6b64\u5e16\u5b50\u6682\u65e0\u53ef\u5206\u4eab\u7684\u884c\u7a0b',
        actions: { like: '\u70b9\u8d5e', saveCopy: '\u4fdd\u5b58\u5e76\u590d\u5236', comments: '\u8bc4\u8bba', share: '\u5206\u4eab' },
        filters: { forYou: '\u4e3a\u4f60\u63a8\u8350', following: '\u5173\u6ce8', providers: '\u670d\u52a1\u5546' },
        composer: {
          eyebrow: '\u53d1\u5e03\u5230Waynest', title: '\u5206\u4eab\u4f60\u7684\u884c\u7a0b',
          helper: '\u5199\u7b14\u8bb0\u3001\u6dfb\u52a0\u7167\u7247\u6216\u5730\u70b9\uff0c\u6216\u9644\u52a0\u4fdd\u5b58\u7684\u8ba1\u5212\u2014\u2014\u53d1\u5e03\u5bf9\u4f60\u91cd\u8981\u7684\u5185\u5bb9\u3002',
          postTitle: '\u6807\u9898', postTitlePlaceholder: '\u5e16\u5b50\u6807\u9898\uff08\u53ef\u9009\uff09', bodyLabel: '\u4f60\u5728\u60f3\u4ec0\u4e48\uff1f',
          bodyPlaceholder: '\u5199\u4e00\u4e9b\u5173\u4e8e\u4f60\u7684\u65c5\u884c\u3001\u5efa\u8bae\u6216\u65f6\u523b\u7684\u5185\u5bb9\u2026',
          imagesSection: '\u7167\u7247', imagesHint: 'PNG\u6216JPG\uff0c\u6700\u591a6\u5f20\u56fe\u7247\u00b7\u6bcf\u5f205MB',
          dropzone: '\u5c06\u56fe\u7247\u62d6\u653e\u5230\u6b64\u5904\u6216\u70b9\u51fb\u6d4f\u89c8', removeImage: '\u79fb\u9664', uploading: '\u4e0a\u4f20\u4e2d\u2026',
          placeSection: '\u5730\u70b9', placeHint: '\u53ef\u9009\u2014\u2014\u5728\u5e16\u5b50\u4e2d\u663e\u793a\u7684\u57ce\u5e02\u3001\u5730\u6807\u6216\u5730\u5740',
          placeHintDb: '\u641c\u7d22Waynest\u5730\u70b9\u6216\u4f7f\u7528\u4f60\u7684\u4f4d\u7f6e\u9009\u62e9\u6700\u8fd1\u7684\u5217\u8868\u3002',
          placeSearchFailed: '\u65e0\u6cd5\u52a0\u8f7d\u5730\u70b9', noNearbyPlaces: '\u5c1a\u672a\u5728\u4f60\u9644\u8fd1\u627e\u5230Waynest\u5730\u70b9',
          nearestPlaceSet: '\u5df2\u9009\u62e9\u6700\u8fd1\u7684\u5730\u70b9', nearestFailed: '\u65e0\u6cd5\u52a0\u8f7d\u9644\u8fd1\u5730\u70b9',
          linkedPlace: '\u5df2\u5173\u8054\u5230Waynest\u5730\u70b9', placePlaceholder: '\u4f8b\u5982\uff1a\u4f2f\u5229\u6052\uff0c\u8001\u57ce\u2026',
          useMyLocation: '\u4f7f\u7528\u6211\u7684\u4f4d\u7f6e', useMyLocationShort: '\u6211\u7684\u4f4d\u7f6e', locating: '\u5b9a\u4f4d\u4e2d\u2026',
          geoUnsupported: '\u6b64\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u5b9a\u4f4d\u529f\u80fd', geoOk: '\u4f4d\u7f6e\u5df2\u6dfb\u52a0\u5230\u4f60\u7684\u5e16\u5b50',
          geoDenied: '\u65e0\u6cd5\u8bfb\u53d6\u4f60\u7684\u4f4d\u7f6e\u2014\u2014\u8bf7\u6539\u4e3a\u8f93\u5165\u5730\u70b9', currentLocation: '\u5f53\u524d\u4f4d\u7f6e',
          needContent: '\u6dfb\u52a0\u6587\u672c\u3001\u7167\u7247\u3001\u5730\u70b9\u6216\u9644\u52a0\u4fdd\u5b58\u7684\u8ba1\u5212', planLabel: '\u4fdd\u5b58\u7684\u8ba1\u5212', planOptional: '\u672a\u9644\u52a0\u8ba1\u5212',
          loadingPlans: '\u6b63\u5728\u52a0\u8f7d\u8ba1\u5212\u2026', noPlans: '\u6682\u65e0\u4fdd\u5b58\u7684\u8ba1\u5212', visibilityLabel: '\u8c01\u53ef\u4ee5\u770b\u5230',
          visPublic: '\u516c\u5f00', visFollowers: '\u5173\u6ce8\u8005', visPrivate: '\u79c1\u5bc6', publishing: '\u53d1\u5e03\u4e2d\u2026', publish: '\u53d1\u5e03'
        }
      },
      inbox: { created: '\u4f1a\u8bdd\u5df2\u521b\u5efa' },
      providerProfile: { title: '\u670d\u52a1\u5546\u8d44\u6599', loadFailed: '\u52a0\u8f7d\u670d\u52a1\u5546\u8d44\u6599\u5931\u8d25', noPosts: '\u6682\u65e0\u5e16\u5b50\u3002', follow: '\u5173\u6ce8', unfollow: '\u53d6\u6d88\u5173\u6ce8', counts: '\u5173\u6ce8\u8005\uff1a{{followers}} | \u6b63\u5728\u5173\u6ce8\uff1a{{following}}', empty: '\u6682\u65e0\u670d\u52a1\u5546\u5e16\u5b50\u3002', followUpdateFailed: '\u66f4\u65b0\u5173\u6ce8\u72b6\u6001\u5931\u8d25' },
      userProfile: { title: '\u7528\u6237\u8d44\u6599', loadFailed: '\u52a0\u8f7d\u8d44\u6599\u5931\u8d25', noPosts: '\u6682\u65e0\u5e16\u5b50\u3002', followUpdateFailed: '\u66f4\u65b0\u5173\u6ce8\u72b6\u6001\u5931\u8d25' },
      postDetail: { loadFailed: '\u52a0\u8f7d\u5e16\u5b50\u8be6\u60c5\u5931\u8d25', addCommentFailed: '\u6dfb\u52a0\u8bc4\u8bba\u5931\u8d25' },
      notifications: { loadFailed: '\u52a0\u8f7d\u901a\u77e5\u5931\u8d25', markFailed: '\u6807\u8bb0\u901a\u77e5\u5931\u8d25' }
    },
    feedback: { loading: '\u6b63\u5728\u52a0\u8f7d\u8bc4\u4ef7\u548c\u8bc4\u8bba...', errors: { reviewsLoad: '\u52a0\u8f7d\u8bc4\u4ef7\u5931\u8d25\u3002\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002', commentsLoad: '\u52a0\u8f7d\u8bc4\u8bba\u5931\u8d25\u3002\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002' } },
    geo: {
      eyebrow: '\u63a2\u7d22', title: '\u56fd\u5bb6\u3001\u57ce\u5e02\u4e0e\u8d27\u5e01',
      subtitle: '\u6d4f\u89c8Waynest\u4e2d\u53ef\u7528\u7684\u5730\u70b9\u548c\u8d27\u5e01\u3002\u6570\u636e\u4e0e\u7ba1\u7406\u5458\u9762\u677fCRUD\u4fdd\u6301\u540c\u6b65\u3002',
      countries: '\u56fd\u5bb6', cities: '\u57ce\u5e02', currencies: '\u8d27\u5e01', items: '\u9879\u76ee', loading: '\u52a0\u8f7d\u4e2d...',
      noCountries: '\u6682\u65e0\u53ef\u7528\u56fd\u5bb6\u3002', noCities: '\u6682\u65e0\u53ef\u7528\u57ce\u5e02\u3002', noCurrencies: '\u6682\u65e0\u53ef\u7528\u8d27\u5e01\u3002',
      errors: { loadFailed: '\u52a0\u8f7d\u4f4d\u7f6e\u6570\u636e\u5931\u8d25\u3002' },
      headers: { name: '\u540d\u79f0', alpha2: 'Alpha 2', alpha3: 'Alpha 3', region: '\u5730\u533a', capital: '\u9996\u90fd', state: '\u5dde/\u7701', population: '\u4eba\u53e3', latitude: '\u7eac\u5ea6', longitude: '\u7ecf\u5ea6', code: '\u4ee3\u7801', fractionSize: '\u5c0f\u6570\u4f4d\u6570' }
    },
    placeDetail: {
      loadFailed: '\u52a0\u8f7d\u5730\u70b9\u8be6\u60c5\u5931\u8d25', loginToWishlist: '\u767b\u5f55\u4ee5\u5c06\u5730\u70b9\u4fdd\u5b58\u5230\u4f60\u7684\u5fc3\u613f\u5355',
      wishlistAdded: '\u5df2\u6dfb\u52a0\u5230\u5fc3\u613f\u5355\u2764\ufe0f', wishlistFailed: '\u66f4\u65b0\u5fc3\u613f\u5355\u5931\u8d25', notFound: '\u672a\u627e\u5230\u5730\u70b9\u3002',
      backToExplore: '\u8fd4\u56de\u63a2\u7d22', inWishlist: '\u5728\u5fc3\u613f\u5355\u4e2d', addToWishlist: '\u6dfb\u52a0\u5230\u5fc3\u613f\u5355',
      noDescription: '\u6b64\u5730\u70b9\u6682\u65e0\u63cf\u8ff0\u3002', type: '\u7c7b\u578b', city: '\u57ce\u5e02', rating: '\u8bc4\u5206',
      notRatedYet: '\u5c1a\u672a\u8bc4\u5206', reviews: '\u8bc4\u4ef7', reviewsCount: '\u6761\u8bc4\u4ef7', planTrip: '\u5728\u6b64\u5904\u89c4\u5212\u884c\u7a0b'
    },
    discover: {
      description: '\u6b64\u9875\u9762\u4e13\u6ce8\u4e8e\u53d1\u73b0\u3002\u6d4f\u89c8\u76ee\u5f55\u3001\u641c\u7d22\u516c\u5f00\u670d\u52a1\u5546\u3001\u67e5\u770b\u8be6\u60c5\uff0c\u65e0\u793e\u4ea4\u5e72\u6270',
      searchHeading: '\u641c\u7d22\u516c\u5171\u76ee\u5f55', searchPlaceholder: '\u641c\u7d22\u670d\u52a1\u5546\u3001\u5730\u70b9\u548c\u6d3b\u52a8',
      eventsTab: '\u6d3b\u52a8', allTab: '\u5168\u90e8', noEventsMessage: '\u76ee\u524d\u6ca1\u6709\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8\u3002\u8bf7\u7a0d\u540e\u518d\u6765\u67e5\u770b'
    }
  },
  pt: {
    landing: {
      hero: {
        badge: 'Acesso Antecipado',
        title: 'Planeje sua pr\u00f3xima viagem com Waynest',
        description: 'Estamos em acesso antecipado. Seja um dos primeiros a criar roteiros enquanto lan\u00e7amos, descubra destinos e molde a comunidade.',
        btnPlan: 'Planejar minha viagem', btnExplore: 'Explorar lugares'
      },
      features: {
        smartPlanning: { title: 'Planejamento Inteligente', description: 'Crie roteiros com etapas claras e um fluxo guiado e tranquilo desde o primeiro dia.' },
        discoverPlaces: { title: 'Descobrir Lugares', description: 'Curta estadias e experi\u00eancias enquanto crescemos a plataforma juntos.' },
        communityReviews: { title: 'Avalia\u00e7\u00f5es da Comunidade', description: 'Avalia\u00e7\u00f5es abertas ap\u00f3s o lan\u00e7amento. Voc\u00ea estar\u00e1 entre as primeiras vozes.' },
        saveShare: { title: 'Salvar e Compartilhar', description: 'Mantenha suas viagens organizadas e compartilhe com amigos em segundos.' }
      },
      stats: {
        tripsCreated: { value: '0', label: 'Viagens Criadas', subLabel: 'Beta: Ainda sem viagens p\u00fablicas' },
        activeTravelers: { value: '0', label: 'Viajantes Ativos', subLabel: 'Seja o primeiro a participar' },
        communityReviews: { value: '0', label: 'Avalia\u00e7\u00f5es da Comunidade', subLabel: 'Avalia\u00e7\u00f5es abertas ap\u00f3s o lan\u00e7amento' }
      }
    },
    landingPage: {
      hero: {
        badge: 'Sistema de viagens IA com dados reais de cat\u00e1logo',
        title: 'O planejador de viagens que parece inteligente, claro e instantaneamente \u00fatil.',
        description: 'Waynest transforma destino, or\u00e7amento, viajantes, interesses, lugares, hor\u00e1rios e eventos p\u00fablicos em uma rota edit\u00e1vel que faz sentido desde a primeira tela.',
        btnPlan: 'Iniciar o planejador IA', btnExplore: 'Explorar lugares ao vivo', btnCreateAccount: 'Criar conta',
        micro: { fastFlow: 'Fluxo r\u00e1pido para convidados sem barreiras de configura\u00e7\u00e3o', explained: 'L\u00f3gica de rota IA explicada, n\u00e3o oculta', planning: 'Projetado para planejar, compartilhar e remixar' }
      },
      visual: {
        analysisKicker: 'Mecanismo de rotas IA', analysisTitle: 'O que Waynest realmente analisa',
        analysisItem1: 'Destino, cidade e dura\u00e7\u00e3o da viagem', analysisItem2: 'Tamanho do grupo, or\u00e7amento e moeda selecionada',
        analysisItem3: 'Tags de interesse, lugares, pre\u00e7os e hor\u00e1rios', analysisItem4: 'Eventos correspondentes e estrutura de rota compartilh\u00e1vel',
        outputKicker: 'Exemplo de sa\u00edda', outputTitle: 'Pr\u00e9via da rota dia a dia',
        dayLabel: 'Dia 1', morning: 'Manh\u00e3', afternoon: 'Tarde', evening: 'Noite',
        morningTitle: 'Marco tur\u00edstico + parada para caf\u00e9 da manh\u00e3', afternoonTitle: 'Atividade consciente do or\u00e7amento com hor\u00e1rios reais',
        eveningTitle: 'Evento correspondente ou recomenda\u00e7\u00e3o gastron\u00f4mica local'
      },
      stats: { aria: 'Estat\u00edsticas da plataforma Waynest', activeTravelers: 'Viajantes ativos', livePlaces: 'Lugares ao vivo', countries: 'Pa\u00edses', sharedRoutes: 'Rotas compartilhadas' },
      standout: { eyebrow: 'Por que se destaca', title: 'Constru\u00eddo para ser diferente das ferramentas gen\u00e9ricas de viagem', description: 'O valor \u00e9 claro num relance: planejamento IA, dados de destinos ao vivo e uma camada social que torna as rotas reutiliz\u00e1veis.' },
      differentiators: {
        realInputs: { title: 'IA que planeja com dados reais', description: 'Waynest constr\u00f3i rotas a partir do seu destino, tamanho do grupo, or\u00e7amento, interesses, pre\u00e7os de lugares e hor\u00e1rios.' },
        firstClick: { title: 'Utiliz\u00e1vel desde o primeiro clique', description: 'Convidados podem explorar, gerar uma viagem e entender o fluxo imediatamente sem configura\u00e7\u00e3o complexa.' },
        socialTravel: { title: 'Viajar como experi\u00eancia social', description: 'Transforme o planejamento privado em rotas compartilh\u00e1veis que outros viajantes podem ver, copiar e remixar.' }
      },
      planner: {
        eyebrow: 'Fluxo do planejador', title: 'Simples o suficiente para qualquer um usar', link: 'Abrir o planejador',
        setDestination: { title: 'Definir o destino', description: 'Escolha o pa\u00eds, cidade, dura\u00e7\u00e3o da viagem e n\u00famero de viajantes.' },
        giveContext: { title: 'Dar contexto \u00e0 IA', description: 'Adicione or\u00e7amento, moeda e interesses para que a rota se ajuste ao seu estilo.' },
        reviewRoute: { title: 'Rever uma rota real', description: 'Obtenha um roteiro dia a dia com lugares, custos, hor\u00e1rios e eventos.' }
      },
      featured: { eyebrow: 'Lugares em destaque', title: 'Destinos reais que os usu\u00e1rios podem explorar agora', link: 'Explorar todos os lugares', loading: 'Carregando destaques de destinos...', empty: 'Nenhum lugar em destaque dispon\u00edvel ainda.', fallbackDescription: 'Explore um destino que pode ser incorporado diretamente em sua pr\u00f3xima rota IA.' },
      events: { eyebrow: 'Pr\u00f3ximos eventos', title: 'Momentos que o planejador pode integrar em uma rota', loading: 'Carregando eventos...', empty: 'Nenhum pr\u00f3ximo evento dispon\u00edvel.' },
      shared: { eyebrow: 'Viagens compartilhadas', title: 'Prova de que as rotas Waynest podem viver al\u00e9m de um usu\u00e1rio', loading: 'Carregando rotas compartilhadas...', empty: 'Nenhuma rota p\u00fablica dispon\u00edvel ainda.', sharedTravelerRoute: 'Rota de viajante compartilhada', publishedBy: 'Publicado por @{{username}}', publishedTravelRoute: 'Rota de viagem publicada' },
      cta: { eyebrow: 'Pronto para come\u00e7ar?', title: 'Comece com o planejador IA e depois cres\u00e7a para a experi\u00eancia completa Waynest.', description: 'Gere uma rota como convidado, fa\u00e7a login para salvar e continue construindo em um sistema que combina usabilidade, descoberta e viagens sociais.', primary: 'Experimentar o planejador', secondary: 'Criar conta', ghost: 'Entrar' },
      openDetails: 'Abrir detalhes'
    },
    login: {
      welcomeBack: 'Bem-vindo de volta', signIn: 'Entre na sua conta',
      emailOrUsername: 'Email ou nome de usu\u00e1rio', enterEmailOrUsername: 'Digite seu email ou nome de usu\u00e1rio',
      password: 'Senha', enterPassword: 'Digite sua senha', loginButton: 'Entrar',
      loggingIn: 'Entrando...', loginFailed: 'Falha no login. Tente novamente.',
      showPassword: 'Mostrar senha', hidePassword: 'Ocultar senha',
      chooseAccountTitle: 'Como deseja continuar?', chooseAccountSubtitle: 'Use Waynest como viajante ou abra suas ferramentas de neg\u00f3cio.',
      choosePersonal: 'Conta pessoal', choosePersonalHint: 'Feed inicial, viagens, reservas e perfil como viajante.',
      chooseProvider: 'Painel do fornecedor', chooseProviderHint: 'Gerencie seu neg\u00f3cio, an\u00fancios e reservas de fornecedor.'
    }
  }
};

console.log('=== Generating translation.json files ===\n');

function countKeys(o, p = '') {
  let c = 0;
  for (const k of Object.keys(o)) {
    const fp = p ? p + '.' + k : k;
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) c += countKeys(o[k], fp);
    else c++;
  }
  return c;
}

for (const lang of LANGUAGES) {
  const filePath = path.join(LOCALE_DIR, lang, 'translation.json');
  const translations = NEW_TRANSLATIONS[lang];

  let existing = {};
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // Start with the EN template (full structure), then override with translations
  const merged = deepMerge(EN_TEMPLATE, translations);

  // If there was an existing file, merge that too (preserves any manual overrides)
  const final = Object.keys(existing).length > 0 ? deepMerge(merged, existing) : merged;

  fs.writeFileSync(filePath, JSON.stringify(final, null, 2) + '\n', 'utf-8');

  const leafCount = countKeys(final);
  const translatedCount = countKeys(translations);
  const status = Object.keys(existing).length > 0 ? '(merged with existing)' : '(new)';
  console.log('  \u2713 ' + lang + '/translation.json \u2014 ' + leafCount + ' keys, ' + translatedCount + ' translated ' + status);
}

console.log('\n\u2713 Done');
