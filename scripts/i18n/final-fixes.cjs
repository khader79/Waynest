/**
 * Fix remaining untranslated keys in es, de, zh, pt translation.json
 * Run: node scripts/i18n/final-fixes.cjs
 */
const fs = require('fs');

const localeDir = 'waynest-FE/public/locales';

const fixes = {
  // ─── SPANISH ───
  es: {
    destinations: {
      labels: { capital: 'Capital:' },
      regions: { asia: 'Asia', europe: 'Europa', africa: '\u00c1frica', americas: 'Am\u00e9rica', oceania: 'Ocean\u00eda' }
    },
    navbar: { social: 'Red social' },
    provider: {
      sidebar: { feed: 'Feed' },
      places: { typeAndRating: '{{type}} \u00b7 {{rating}} \u2605', table: { image: '' } },
      bookings: { columns: { total: 'Total' } },
      profile: { fields: { slug: 'Slug' }, providerTypes: { HOTEL: 'Hotel' } }
    },
    admin: { common: { totalItems: 'Total', no: 'No' }, places: { slug: 'Slug' } },
    common: { no: 'No' },
    geo: { headers: { capital: 'Capital' } },
    tripPlanner: {
      form: { styles: { cultural: 'Cultural' } },
      placeTypes: { hotel: 'Hotel' },
      weather: { temperature: '{{temp}}\u00b0C', temperatureF: '{{temp}}\u00b0F', condition: '{{condition}}' }
    },
    navigation: { tours: 'Tours', blog: 'Blog', cookies: 'Cookies' },
    dates: {
      monthsShort: {
        january: 'Ene', february: 'Feb', march: 'Mar', april: 'Abr', may: 'May',
        june: 'Jun', july: 'Jul', august: 'Ago', september: 'Sep', october: 'Oct',
        november: 'Nov', december: 'Dic'
      }
    },
    currency: { eur: 'Euro' },
    units: { km: 'km', mi: 'mi', m: 'm', ft: 'ft', kg: 'kg', lb: 'lb', l: 'L', gal: 'gal', kph: 'km/h', mph: 'mph' }
  },

  // ─── GERMAN ───
  de: {
    contact: {
      hero: { title: 'Kontakt', subtitle: 'Haben Sie eine Frage oder ein Feedback? Wir freuen uns darauf, von Ihnen zu h\u00f6ren!' },
      contactInformation: {
        title: 'Kontaktinformationen', email: 'E-Mail', emailValue: 'support@waynest.com',
        responseTime: 'Antwortzeit', responseTimeValue: 'Innerhalb von 24 Stunden',
        officeHours: 'B\u00fcrozeiten', officeHoursValue: 'Montag - Freitag: 9:00 - 18:00 Uhr'
      },
      followUs: { title: 'Folgen Sie uns', twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' },
      form: {
        title: 'Senden Sie uns eine Nachricht', name: 'Name', namePlaceholder: 'Ihr Name',
        email: 'E-Mail', emailPlaceholder: 'ihre.email@beispiel.de',
        subject: 'Betreff', subjectPlaceholder: 'Betreff ausw\u00e4hlen',
        subjectOptions: { general: 'Allgemeine Anfrage', support: 'Technischer Support', feedback: 'Feedback', partnership: 'Partnerschaft', other: 'Sonstiges' },
        message: 'Nachricht', messagePlaceholder: 'Erz\u00e4hlen Sie uns, wie wir helfen k\u00f6nnen...',
        sendButton: 'Nachricht senden', sending: 'Senden...', required: '*'
      },
      success: { title: 'Vielen Dank f\u00fcr Ihre Nachricht!', message: 'Wir haben Ihre Nachricht erhalten und werden uns bald bei Ihnen melden.', sendAnother: 'Weitere Nachricht senden' }
    },
    about: {
      hero: { title: '\u00dcber Waynest', subtitle: 'Ihr vertrauensw\u00fcrdiger Begleiter zur Entdeckung erstaunlicher Reiseziele weltweit' },
      mission: { title: 'Unsere Mission', description: 'Bei Waynest glauben wir, dass Reisen zug\u00e4nglich, inspirierend und unvergesslich sein sollten. Unsere Mission ist es, Reisende mit den sch\u00f6nsten Zielen der Welt zu verbinden.' },
      whatWeOffer: {
        title: 'Was wir bieten',
        discoverPlaces: { title: 'Orte entdecken', description: 'Entdecken Sie Tausende von Zielen, von pulsierenden St\u00e4dten bis zu ruhigen Naturwundern.' },
        expertReviews: { title: 'Expertenbewertungen', description: 'Lesen Sie authentische Bewertungen von anderen Reisenden und erhalten Sie Insidertipps.' },
        planYourTrip: { title: 'Reise planen', description: 'Speichern Sie Lieblingsziele, erstellen Sie Wunschlisten und planen Sie Ihre perfekte Reiseroute.' },
        communityDriven: { title: 'Community-getrieben', description: 'Werden Sie Teil einer Gemeinschaft leidenschaftlicher Reisender.' }
      },
      whyChoose: {
        title: 'Warum Waynest?',
        comprehensiveDatabase: 'Umfassende Datenbank:',
        comprehensiveDatabaseDesc: 'Zugriff auf Informationen \u00fcber L\u00e4nder, St\u00e4dte und Orte weltweit.',
        realExperiences: 'Echte Erfahrungen:',
        realExperiencesDesc: 'Erhalten Sie Einblicke von echten Reisenden.',
        easyPlanning: 'Einfache Planung:',
        easyPlanningDesc: 'Organisieren Sie Ihre Reisepl\u00e4ne mit unseren intuitiven Tools.',
        alwaysUpdated: 'Immer aktuell:',
        alwaysUpdatedDesc: 'Unsere Plattform wird st\u00e4ndig mit neuen Zielen aktualisiert.'
      },
      ourStory: {
        title: 'Unsere Geschichte',
        paragraph1: 'Waynest entstand aus einer einfachen Idee: Reiseplanung einfacher und angenehmer zu gestalten.',
        paragraph2: 'Egal ob erfahrener Reisender oder erste Reise \u2013 Waynest hilft Ihnen, die Welt auf eine ganz neue Weise zu entdecken.'
      },
      joinCommunity: {
        title: 'Werden Sie Teil unserer Community',
        description: 'Bereit f\u00fcr Ihr n\u00e4chstes Abenteuer? Schlie\u00dfen Sie sich tausenden Reisenden an, die Waynest vertrauen.',
        getStarted: 'Loslegen', exploreDestinations: 'Reiseziele entdecken'
      }
    },
    destinations: {
      hero: { eyebrow: 'Entdecke die Welt', title: 'Reiseziele entdecken', subtitle: 'Erkunde erstaunliche L\u00e4nder und St\u00e4dte weltweit', searchPlaceholder: 'Suche Reiseziele, St\u00e4dte oder Hauptst\u00e4dte...' },
      regions: { all: 'Alle', asia: 'Asien', europe: 'Europa', africa: 'Afrika', americas: 'Amerika', oceania: 'Ozeanien' },
      labels: { capital: 'Hauptstadt:', region: 'Region:', cities: 'St\u00e4dte:', more: 'mehr' },
      filtersNav: 'Nach Region filtern',
      flagAlt: 'Flagge von {{country}}',
      loading: 'Reiseziele werden geladen...',
      emptyState: 'Keine Reiseziele gefunden. Versuchen Sie es mit anderen Suchbegriffen oder Filtern.'
    },
    explore: {
      hero: { title: 'Orte erkunden', subtitle: 'Entdecken Sie erstaunliche Reiseziele weltweit', searchPlaceholder: 'Suche Orte...', googleUnavailable: 'Die Google-Platzsuche ist in dieser Umgebung nicht verf\u00fcgbar.', description: 'Diese Seite konzentriert sich auf die Entdeckung. Durchsuchen Sie den Katalog, suchen Sie \u00f6ffentliche Anbieter und \u00f6ffnen Sie Details ohne soziales Rauschen.' },
      categories: { all: 'Alle', restaurant: 'Restaurant', cafe: 'Caf\u00e9', attraction: 'Attraktion', museum: 'Museum', park: 'Park', historical: 'Historisch', events: 'Veranstaltungen' },
      search: { title: '\u00d6ffentlichen Katalog durchsuchen', placeholder: 'Suche Anbieter, Orte und Veranstaltungen...', loading: 'Suche...' },
      events: { title: 'Veranstaltungen', emptyMessage: 'Derzeit keine bevorstehenden Veranstaltungen.' },
      emptyState: 'Keine Orte gefunden'
    },
    register: {
      title: 'Konto erstellen', subtitle: 'Registrieren Sie sich',
      firstName: 'Vorname', firstNamePlaceholder: 'Geben Sie Ihren Vornamen ein',
      lastName: 'Nachname', lastNamePlaceholder: 'Geben Sie Ihren Nachnamen ein',
      email: 'E-Mail', emailPlaceholder: 'Geben Sie Ihre E-Mail ein',
      username: 'Benutzername', usernamePlaceholder: 'W\u00e4hlen Sie einen Benutzernamen',
      password: 'Passwort', passwordPlaceholder: 'Geben Sie Ihr Passwort ein (min. 8 Zeichen)',
      confirmPassword: 'Passwort best\u00e4tigen', confirmPasswordPlaceholder: 'Best\u00e4tigen Sie Ihr Passwort',
      signUp: 'Registrieren', creatingAccount: 'Konto wird erstellt...',
      alreadyHaveAccount: 'Bereits ein Konto?', signIn: 'Anmelden',
      passwordsDoNotMatch: 'Passw\u00f6rter stimmen nicht \u00fcberein',
      passwordTooShort: 'Passwort muss mindestens 8 Zeichen lang sein',
      registrationFailed: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
      showPassword: 'Passwort anzeigen', hidePassword: 'Passwort verbergen'
    },
    navbar: {
      home: 'Startseite', explore: 'Entdecken', search: 'Suche', planner: 'Planer', social: 'Social',
      inbox: 'Posteingang', notifications: 'Benachrichtigungen',
      notificationsMenu: 'Benachrichtigungen', notificationsSeeAll: 'Alle Benachrichtigungen anzeigen',
      about: '\u00dcber uns', contact: 'Kontakt', login: 'Anmelden', signUp: 'Registrieren',
      userPanel: 'Benutzerbereich', adminPanel: 'Adminbereich',
      providerPanel: 'Business-Konto', businessAccount: 'Business-Konto',
      logout: 'Abmelden', welcome: 'Willkommen', dark: 'Dunkel', light: 'Hell',
      language: 'Sprache', toggleSidebar: 'Sidebar umschalten', closeSidebar: 'Sidebar schlie\u00dfen',
      providerProfileSection: 'Anbieterprofil', backToFeed: 'Zur\u00fcck zum Feed',
      personalAccount: 'Pers\u00f6nliches Konto'
    },
    user: {
      sidebar: { dashboard: 'Dashboard', profile: 'Profil', bookings: 'Buchungen', wishlist: 'Wunschliste' },
      dashboard: { title: 'Dashboard', myBookings: 'Meine Buchungen', wishlist: 'Wunschliste', myReviews: 'Meine Bewertungen', profileStatus: 'Profilstatus', active: 'Aktiv' },
      wishlist: { title: 'Wunschliste', empty: 'Ihre Wunschliste ist leer', emptyAction: 'Jetzt entdecken!', exploreButton: 'Orte erkunden', remove: 'Entfernen', rating: 'Bewertung' },
      bookings: { title: 'Meine Buchungen', empty: 'Noch keine Buchungen', emptyAction: 'Orte erkunden und buchen!', exploreButton: 'Orte erkunden', persons: 'Personen', cancel: 'Stornieren', status: { pending: 'Ausstehend', confirmed: 'Best\u00e4tigt', cancelled: 'Storniert', completed: 'Abgeschlossen' } },
      profile: { connectionsBack: 'Zur\u00fcck', connectionsBackUser: 'Zur\u00fcck', title: 'Ihr Profil', subtitle: 'Halten Sie Ihre pers\u00f6nlichen Daten aktuell.', name: 'Name', email: 'E-Mail', phone: 'Telefon', saveChanges: '\u00c4nderungen speichern', accountCenter: 'Konto-Center' },
      tripPlanner: { title: 'KI-Reiseplaner', planYourTrip: 'Planen Sie Ihre perfekte Reise' }
    },
    provider: {
      sidebar: { feed: 'Feed', dashboard: 'Dashboard', profile: 'Profil', createPost: 'Beitrag erstellen', sectionOverview: '\u00dcbersicht', sectionOperations: 'Betrieb', sectionPresence: 'Pr\u00e4senz', sectionAccount: 'Konto', publicPage: '\u00d6ffentliche Seite', businessSettings: 'Gesch\u00e4ftseinstellungen', myPlaces: 'Meine Orte', events: 'Veranstaltungen', bookings: 'Buchungen', reviews: 'G\u00e4stebewertungen' },
      createPost: { title: 'Beitrag erstellen', subtitle: 'Teilen Sie Updates, Angebote oder Ank\u00fcndigungen mit Ihren G\u00e4sten.' },
      business: {
        loadingTitle: 'L\u00e4dt\u2026', sharePage: 'Seite teilen', linkCopied: 'Link in die Zwischenablage kopiert', linkCopyFailed: 'Link konnte nicht kopiert werden',
        statsLabel: 'Gesch\u00e4ftsstatistiken', statPlaces: 'Orte', statRating: 'Bewertung', statReviews: 'Feedback', statBookings: 'Buchungen',
        tabsAria: 'Gesch\u00e4ftsseitenabschnitte', tabOverview: '\u00dcbersicht', tabServices: 'Orte', tabEvents: 'Veranstaltungen', tabReviews: 'G\u00e4stefeedback',
        placesTitle: 'Orte', noPlaces: 'Noch keine Orte gelistet.',
        eventsTitle: 'Bevorstehende Veranstaltungen', noEvents: 'Keine bevorstehenden Veranstaltungen geplant.',
        reviewsTitle: 'G\u00e4stefeedback', guestFeedbackTitle: 'G\u00e4stefeedback', guestFeedbackSub: 'Bewertungen und Kommentare von Besuchern.',
        feedbackStripTitle: 'G\u00e4stefeedback', feedbackStripHint: 'Alle Bewertungen und Kommentare anzeigen', feedbackStripEmpty: 'Noch keine Bewertungen.',
        feedbackCountShort: 'Bewertungen', feedbackStripAria: 'G\u00e4stefeedback',
        mapTitle: 'Standort', mapSub: 'Servicebereich auf der Karte',
        placesSub: 'Veranstaltungsorte und Eintr\u00e4ge f\u00fcr dieses Unternehmen',
        eventsSub: 'Geplante Erlebnisse und Termine', reviewsSub: 'Feedback von G\u00e4sten',
        postsSub: 'Von diesem Unternehmen ver\u00f6ffentlichte Updates',
        viewMap: 'Karte', bookNow: 'Buchen', bookNowComingSoon: 'Buchen (Demn\u00e4chst)'
      },
      common: { active: 'Aktiv', inactive: 'Inaktiv', notSetup: 'Ihr Anbieterkonto ist nicht eingerichtet.' },
      businessFeed: {
        titleFallback: 'Unternehmen', atAGlance: 'Auf einen Blick',
        heroLead: 'Verwalten Sie Beitr\u00e4ge, Buchungen und Ihre \u00f6ffentliche Pr\u00e4senz von einem Ort aus.',
        heroSettings: 'Gesch\u00e4ftseinstellungen',
        separationNotice: 'Ihr Gesch\u00e4ftskonto ist getrennt von Ihrem pers\u00f6nlichen Profil.',
        feedTitle: 'Unternehmens-Feed',
        peopleTitle: 'Zielgruppe & Personen', peopleBody: 'Ihre \u00f6ffentliche Seite zeigt Follower.',
        viewPublicPage: '\u00d6ffentliche Gesch\u00e4ftsseite \u00f6ffnen', personalMessages: 'Pers\u00f6nliche Nachrichten & Freunde',
        teamComingSoon: 'Teammitglieder zur Mitverwaltung einladen (demn\u00e4chst verf\u00fcgbar).',
        loadError: 'Fehler beim Laden des Unternehmens-Feeds', noPosts: 'Noch keine Beitr\u00e4ge in Ihrem Unternehmens-Feed.',
        workspaceEyebrow: 'Gesch\u00e4ftsarbeitsbereich',
        trustVerified: 'Verifiziertes Unternehmen', trustPending: 'Verifizierung l\u00e4uft', trustAttention: 'Handlungsbedarf f\u00fcr Ihr Konto',
        opsNav: 'Betrieb', opsPlaces: 'Eintr\u00e4ge', opsEvents: 'Veranstaltungen', opsBookings: 'Buchungen', opsReviews: 'G\u00e4stebewertungen',
        emptyFeedTitle: 'Beginnen Sie, G\u00e4ste zu erreichen', noPostsRich: 'Von Ihnen als Unternehmen ver\u00f6ffentlichte Beitr\u00e4ge erscheinen hier und auf Ihrer \u00f6ffentlichen Seite.',
        ctaCreatePost: 'Unternehmensbeitrag erstellen', ctaAddPlace: 'Eintr\u00e4ge verwalten',
        quickNav: 'Verkn\u00fcpfungen', quickPlaces: 'Orte', quickBookings: 'Buchungen', quickSettings: 'Einstellungen',
        metricMeta: { places: 'Mit Ihrem Unternehmen verkn\u00fcpfte Orte', bookings: 'Buchungen in Ihren Eintr\u00e4gen', reviews: 'Bewertungen von G\u00e4sten', rating: 'Durchschnitt aller Bewertungen' }
      },
      dashboard: { defaultTitle: 'Anbieter-Dashboard', metrics: { totalPlaces: 'Orte gesamt', totalBookings: 'Buchungen gesamt', totalReviews: 'Bewertungen gesamt', averageRating: 'Durchschnittsbewertung' }, actions: { managePlaces: 'Orte verwalten', viewBookings: 'Buchungen anzeigen', profile: 'Anbieterprofil' }, feedback: { loadError: 'Fehler beim Laden des Dashboards' } },
      places: {
        title: 'Meine Orte', empty: 'Keine Orte f\u00fcr Ihr Anbieterkonto gefunden.', add: 'Ort hinzuf\u00fcgen',
        edit: 'Bearbeiten', save: 'Speichern', modalCreate: 'Ort hinzuf\u00fcgen', modalEdit: 'Ort bearbeiten',
        typeAndRating: '{{type}} \u00b7 {{rating}} \u2605',
        table: { image: '', name: 'Name', type: 'Typ', city: 'Stadt', rating: 'Bewertung', active: 'Status', actions: 'Aktionen' },
        fields: { name: 'Name', description: 'Beschreibung', type: 'Typ', city: 'Stadt', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', slug: 'Slug (optional)', active: 'Aktiv', tags: 'Tags', cover: 'Titelbild' },
        actions: { editPlaces: 'Orte bearbeiten', editPlace: 'Bearbeiten' },
        feedback: { loadError: 'Fehler beim Laden der Orte' }
      },
      events: {
        title: 'Veranstaltungen', add: 'Neue Veranstaltung', edit: 'Bearbeiten', save: 'Speichern',
        modalCreate: 'Veranstaltung erstellen', modalEdit: 'Veranstaltung bearbeiten',
        needVenue: 'Erstellen Sie zuerst einen Ort, um Veranstaltungen zu hosten.',
        columns: { title: 'Titel', venue: 'Veranstaltungsort', start: 'Beginnt', price: 'Preis', active: 'Aktiv', actions: 'Aktionen' },
        fields: { title: 'Titel', description: 'Beschreibung', venue: 'Veranstaltungsort', start: 'Start', end: 'Ende', tickets: 'Verf\u00fcgbare Tickets', price: 'Ticketpreis', currency: 'W\u00e4hrung', active: 'Ver\u00f6ffentlicht' }
      },
      bookings: {
        title: 'Anbieterbuchungen', filterAll: 'Alle Status',
        columns: { place: 'Ort', date: 'Buchungsdatum', persons: 'G\u00e4ste', total: 'Gesamt', status: 'Status' },
        status: { pending: 'Ausstehend', confirmed: 'Best\u00e4tigt', completed: 'Abgeschlossen', cancelled: 'Storniert' },
        feedback: { loadError: 'Fehler beim Laden der Buchungen', statusError: 'Status konnte nicht aktualisiert werden' }
      },
      profile: {
        title: 'Anbieterprofil',
        fields: { displayName: 'Anzeigename', slug: 'Slug', providerType: 'Anbietertyp', phone: 'Telefon', website: 'Website' },
        providerTypes: { HOTEL: 'Hotel', RESTAURANT: 'Restaurant', TOUR_PROVIDER: 'Reiseveranstalter', EVENT_ORGANIZER: 'Veranstaltungsorganisator', ACTIVITY_PROVIDER: 'Aktivit\u00e4tsanbieter' },
        actions: { save: '\u00c4nderungen speichern' },
        validation: { displayName: 'Bitte geben Sie einen Anzeigenamen ein', slug: 'Bitte geben Sie einen Slug ein', providerType: 'Bitte w\u00e4hlen Sie einen Anbietertyp', phone: 'Bitte geben Sie eine Telefonnummer ein' },
        feedback: { loadError: 'Fehler beim Laden des Profils', updateSuccess: 'Profil erfolgreich aktualisiert', updateError: 'Profil konnte nicht aktualisiert werden' }
      },
      apply: {
        steps: { business: 'Unternehmen', contact: 'Kontakt', review: 'Pr\u00fcfung' },
        stepBusinessTitle: 'Unternehmensdetails', stepContactTitle: 'Kontakt & Typ', stepReviewTitle: 'Pr\u00fcfen & einreichen',
        highlights: {
          businessBasics: { title: 'Alle Unternehmensgrundlagen', text: 'Name, Beschreibung, Standort, Steuerdetails und Kategorien in einem klaren Ablauf.' },
          deviceImages: { title: 'Bilder von Ihrem Ger\u00e4t', text: 'Laden Sie Ihr Logo und Titelbild direkt hoch, mit sofortiger Vorschau.' },
          ownerFirst: { title: 'Inhaber-zuerst-Zugriff', text: 'Ihr Konto wird zum Gesch\u00e4ftsinhaber.' }
        },
        next: 'Weiter', back: 'Zur\u00fcck',
        successTitle: 'Bewerbung erhalten', successBody: 'Vielen Dank. Ihre Anfrage wird gepr\u00fcft. Wir benachrichtigen Sie.', goHome: 'Zur\u00fcck zur Startseite'
      }
    },
    admin: {
      dashboard: { title: 'Admin-Dashboard', totalUsers: 'Benutzer gesamt', totalProviders: 'Anbieter gesamt', totalPlaces: 'Orte gesamt', totalReviews: 'Bewertungen gesamt', failedToLoadStats: 'Fehler beim Laden der Statistiken' },
      common: { actions: 'Aktionen', edit: 'Bearbeiten', delete: 'L\u00f6schen', add: 'Hinzuf\u00fcgen', save: 'Speichern', cancel: 'Abbrechen', loading: 'L\u00e4dt...', totalItems: 'Gesamt', items: 'Eintr\u00e4ge', pleaseInput: 'Bitte eingeben', failedToSubmit: 'Fehler beim Absenden', confirmDelete: 'L\u00f6schen best\u00e4tigen', deleteConfirmMessage: 'Sind Sie sicher? Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.', deleteButton: 'L\u00f6schen', createdSuccessfully: 'erfolgreich erstellt', updatedSuccessfully: 'erfolgreich aktualisiert', deletedSuccessfully: 'erfolgreich gel\u00f6scht', entityCreatedSuccessfully: '{{entity}} erfolgreich erstellt', entityUpdatedSuccessfully: '{{entity}} erfolgreich aktualisiert', entityDeletedSuccessfully: '{{entity}} erfolgreich gel\u00f6scht', failedToLoad: 'Fehler beim Laden', failedToSave: 'Fehler beim Speichern', failedToDelete: 'Fehler beim L\u00f6schen', yes: 'Ja', no: 'Nein' },
      sidebar: { dashboard: 'Dashboard', users: 'Benutzer', providers: 'Anbieter', places: 'Orte', countries: 'L\u00e4nder', cities: 'St\u00e4dte', currencies: 'W\u00e4hrungen', tags: 'Tags', events: 'Veranstaltungen', reviews: 'Bewertungen', placePricing: 'Orts-Preisgestaltung', openingHours: '\u00d6ffnungszeiten', providerMembership: 'Anbietermitgliedschaft', devices: 'Ger\u00e4te' },
      users: { title: 'Benutzerverwaltung', addUser: 'Benutzer hinzuf\u00fcgen', editUser: 'Benutzer bearbeiten', deleteUser: 'Benutzer l\u00f6schen', deleteConfirm: 'Sind Sie sicher, dass Sie den Benutzer l\u00f6schen m\u00f6chten?', firstName: 'Vorname', lastName: 'Nachname', email: 'E-Mail', username: 'Benutzername', password: 'Passwort', role: 'Rolle', phone: 'Telefon', status: 'Status', createdAt: 'Erstellt am' },
      providers: { title: 'Anbieterverwaltung', addProvider: 'Anbieter hinzuf\u00fcgen', editProvider: 'Anbieter bearbeiten', deleteProvider: 'Anbieter l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', displayName: 'Anzeigename', providerType: 'Anbietertyp', website: 'Website', verificationStatus: 'Verifizierungsstatus' },
      places: { title: 'Ortsverwaltung', addPlace: 'Ort hinzuf\u00fcgen', editPlace: 'Ort bearbeiten', deletePlace: 'Ort l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', name: 'Name', slug: 'Slug', description: 'Beschreibung', type: 'Typ', city: 'Stadt', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', ratingAverage: 'Durchschnittsbewertung', ratingCount: 'Bewertungsanzahl', isActive: 'Aktiv', isVerified: 'Verifiziert' },
      countries: { title: 'L\u00e4nderverwaltung', addCountry: 'Land hinzuf\u00fcgen', editCountry: 'Land bearbeiten', deleteCountry: 'Land l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', nativeName: 'Landesname', alpha2: 'Alpha-2', alpha3: 'Alpha-3', numeric: 'Numerischer Code' },
      cities: { title: 'St\u00e4dteverwaltung', addCity: 'Stadt hinzuf\u00fcgen', editCity: 'Stadt bearbeiten', deleteCity: 'Stadt l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', stateName: 'Bundesland', population: 'Bev\u00f6lkerung' },
      currencies: { title: 'W\u00e4hrungsverwaltung', addCurrency: 'W\u00e4hrung hinzuf\u00fcgen', editCurrency: 'W\u00e4hrung bearbeiten', deleteCurrency: 'W\u00e4hrung l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', code: 'Code', fractionSize: 'Nachkommastellen' },
      tags: { title: 'Tag-Verwaltung', addTag: 'Tag hinzuf\u00fcgen', editTag: 'Tag bearbeiten', deleteTag: 'Tag l\u00f6schen', deleteConfirm: 'Sind Sie sicher?' },
      events: { title: 'Veranstaltungsverwaltung', addEvent: 'Veranstaltung hinzuf\u00fcgen', editEvent: 'Veranstaltung bearbeiten', deleteEvent: 'Veranstaltung l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', titleField: 'Titel', venue: 'Veranstaltungsort', startDate: 'Startdatum', endDate: 'Enddatum', availableTickets: 'Verf\u00fcgbare Tickets', ticketPrice: 'Ticketpreis', currencyCode: 'W\u00e4hrungscode' },
      reviews: { title: 'Bewertungsverwaltung', addReview: 'Bewertung hinzuf\u00fcgen', editReview: 'Bewertung bearbeiten', deleteReview: 'Bewertung l\u00f6schen', deleteConfirm: 'Sind Sie sicher?' },
      placePricing: { title: 'Preisverwaltung', addPlacePricing: 'Preis hinzuf\u00fcgen', editPlacePricing: 'Preis bearbeiten', deletePlacePricing: 'Preis l\u00f6schen', deleteConfirm: 'Sind Sie sicher?' },
      placeOpeningHours: { title: '\u00d6ffnungszeitenverwaltung', addPlaceOpeningHours: '\u00d6ffnungszeit hinzuf\u00fcgen', editPlaceOpeningHours: '\u00d6ffnungszeit bearbeiten', deletePlaceOpeningHours: '\u00d6ffnungszeit l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', dayOfWeek: 'Wochentag', openTime: '\u00d6ffnungszeit', closeTime: 'Schlie\u00dfzeit', days: { sunday: 'Sonntag', monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag' } },
      providerMembership: { title: 'Anbietermitgliedschaftsverwaltung', addProviderMembership: 'Mitgliedschaft hinzuf\u00fcgen', editProviderMembership: 'Mitgliedschaft bearbeiten', deleteProviderMembership: 'Mitgliedschaft l\u00f6schen', deleteConfirm: 'Sind Sie sicher?', providerRole: 'Anbieterrolle' }
    },
    languages: { en: 'Englisch', ar: 'Arabisch', ru: 'Russisch', fr: 'Franz\u00f6sisch', tr: 'T\u00fcrkisch', es: 'Spanisch', de: 'Deutsch', zh: 'Chinesisch', pt: 'Portugiesisch' },
    common: { no: 'Nein', ok: 'OK', optional: 'Optional', optionalField: 'Optional', info: 'Info' },
    search: {
      label: 'Suche', placeholder: 'Personen, Orte, Unternehmen\u2026', placeholderGuest: 'Anbieter, Orte, Veranstaltungen\u2026',
      submit: 'Los', failed: 'Suche fehlgeschlagen', resultsFor: 'Ergebnisse f\u00fcr \u201e{{q}}\u201c',
      emptyTitle: 'Suche', useBar: 'Nutzen Sie das Suchfeld auf dieser Seite.',
      typeToSearch: 'Geben Sie oben ein, um Personen, Anbieter, Orte und Veranstaltungen zu suchen.',
      noResults: 'Noch keine Treffer.', planFromHere: 'Von hier aus planen',
      planNeedsCity: 'W\u00e4hlen Sie einen Ort mit Stadt, um von hier aus zu planen.',
      publicTripsTitle: '\u00d6ffentliche Reisen von Reisenden', publicTripsEmpty: 'Noch keine \u00f6ffentlichen Reisen.',
      publicTripsLoadFailed: 'Reisen konnten nicht geladen werden.', publicTripsBy: 'Von @{{username}}'
    },
    friends: { connected: 'Freunde', requestSent: 'Anfrage gesendet', accept: 'Akzeptieren', decline: 'Ablehnen', add: 'Freund hinzuf\u00fcgen' },
    social: {
      profile: 'Meine Beitr\u00e4ge', settings: 'Einstellungen', follow: 'Folgen', unfollow: 'Entfolgen',
      feed: {
        title: 'Community-Feed', openSearch: 'Suche', loading: 'Feed wird geladen...',
        empty: 'Noch keine Beitr\u00e4ge in diesem Feed.',
        traveler: 'Reisender', openSharedTrip: 'Geteilte Reise \u00f6ffnen',
        loadFailed: 'Fehler beim Laden des Social Feeds', savedPlansLoadFailed: 'Fehler beim Laden der gespeicherten Pl\u00e4ne',
        loginToPublish: 'Bitte anmelden zum Ver\u00f6ffentlichen', selectPlanFirst: 'Bitte w\u00e4hlen Sie einen gespeicherten Plan',
        published: 'Beitrag ver\u00f6ffentlicht', publishedToast: 'Ver\u00f6ffentlicht!', publishFailed: 'Fehler beim Ver\u00f6ffentlichen',
        loginFirst: 'Bitte zuerst anmelden', likeUpdated: 'Gef\u00e4llt mir aktualisiert',
        savedToAccount: 'In Ihrem Konto gespeichert', shareCopied: 'Reiselink kopiert',
        shareUnavailable: 'Dieser Beitrag hat noch keine teilbare Reise',
        actions: { like: 'Gef\u00e4llt mir', saveCopy: 'Speichern & Kopieren', comments: 'Kommentare', share: 'Teilen' },
        filters: { forYou: 'F\u00fcr dich', following: 'Folge ich', providers: 'Anbieter' },
        composer: {
          eyebrow: 'Auf Waynest ver\u00f6ffentlichen', title: 'Ihre Reise teilen',
          helper: 'Schreiben Sie eine Notiz, f\u00fcgen Sie Fotos oder einen Ort hinzu oder h\u00e4ngen Sie einen gespeicherten Plan an.',
          postTitle: 'Titel', postTitlePlaceholder: 'Beitragstitel (optional)',
          bodyLabel: 'Was bewegt Sie?', bodyPlaceholder: 'Schreiben Sie etwas \u00fcber Ihre Reise\u2026',
          imagesSection: 'Fotos', imagesHint: 'PNG oder JPG, bis zu 6 Bilder \u00b7 je 5MB',
          dropzone: 'Bilder hier ablegen oder zum Durchsuchen klicken', removeImage: 'Entfernen',
          uploading: 'Wird hochgeladen\u2026',
          placeSection: 'Ort', placeHint: 'Optional \u2013 Stadt, Wahrzeichen oder Adresse im Beitrag',
          placeHintDb: 'Durchsuchen Sie Waynest-Orte oder nutzen Sie Ihren Standort.',
          placeSearchFailed: 'Orte konnten nicht geladen werden',
          noNearbyPlaces: 'Keine Waynest-Orte in Ihrer N\u00e4he gefunden',
          nearestPlaceSet: 'N\u00e4chstgelegener Ort ausgew\u00e4hlt',
          nearestFailed: 'Orte in der N\u00e4he konnten nicht geladen werden',
          linkedPlace: 'Mit Waynest-Ort verkn\u00fcpft',
          placePlaceholder: 'z.B. Bethlehem, Altstadt\u2026',
          useMyLocation: 'Meinen Standort verwenden', useMyLocationShort: 'Mein Standort', locating: 'Wird geortet\u2026',
          geoUnsupported: 'Standortbestimmung wird von diesem Browser nicht unterst\u00fctzt',
          geoOk: 'Standort zu Ihrem Beitrag hinzugef\u00fcgt',
          geoDenied: 'Ihr Standort konnte nicht gelesen werden \u2013 geben Sie stattdessen einen Ort ein',
          currentLocation: 'Aktueller Standort',
          needContent: 'F\u00fcgen Sie Text, Fotos, einen Ort oder einen gespeicherten Plan hinzu',
          planLabel: 'Gespeicherter Plan', planOptional: 'Kein Plan angeh\u00e4ngt',
          loadingPlans: 'Pl\u00e4ne werden geladen\u2026', noPlans: 'Keine gespeicherten Pl\u00e4ne',
          visibilityLabel: 'Wer kann sehen', visPublic: '\u00d6ffentlich', visFollowers: 'Follower', visPrivate: 'Privat',
          publishing: 'Wird ver\u00f6ffentlicht\u2026', publish: 'Ver\u00f6ffentlichen'
        }
      },
      inbox: { created: 'Unterhaltung erstellt' },
      providerProfile: {
        title: 'Anbieterprofil', loadFailed: 'Fehler beim Laden des Anbieterprofils',
        noPosts: 'Noch keine Beitr\u00e4ge.', follow: 'Folgen', unfollow: 'Entfolgen',
        counts: 'Follower: {{followers}} | Gefolgt: {{following}}',
        empty: 'Noch keine Anbieterbeitr\u00e4ge.', followUpdateFailed: 'Folgen-Status konnte nicht aktualisiert werden'
      },
      userProfile: {
        title: 'Benutzerprofil', loadFailed: 'Fehler beim Laden des Profils',
        noPosts: 'Noch keine Beitr\u00e4ge.', followUpdateFailed: 'Folgen-Status konnte nicht aktualisiert werden'
      },
      postDetail: { loadFailed: 'Fehler beim Laden der Beitragsdetails', addCommentFailed: 'Fehler beim Hinzuf\u00fcgen des Kommentars' },
      notifications: { loadFailed: 'Fehler beim Laden der Benachrichtigungen', markFailed: 'Fehler beim Markieren der Benachrichtigungen' }
    },
    feedback: {
      loading: 'Bewertungen und Kommentare werden geladen...',
      errors: { reviewsLoad: 'Bewertungen konnten nicht geladen werden. Bitte versuchen Sie es sp\u00e4ter erneut.', commentsLoad: 'Kommentare konnten nicht geladen werden.' }
    },
    geo: {
      eyebrow: 'Entdecken', title: 'L\u00e4nder, St\u00e4dte & W\u00e4hrungen',
      subtitle: 'Durchsuchen Sie die in Waynest verf\u00fcgbaren Standorte und W\u00e4hrungen.',
      countries: 'L\u00e4nder', cities: 'St\u00e4dte', currencies: 'W\u00e4hrungen', items: 'Eintr\u00e4ge',
      loading: 'L\u00e4dt...', noCountries: 'Keine L\u00e4nder verf\u00fcgbar.', noCities: 'Keine St\u00e4dte verf\u00fcgbar.',
      noCurrencies: 'Keine W\u00e4hrungen verf\u00fcgbar.',
      errors: { loadFailed: 'Standortdaten konnten nicht geladen werden.' },
      headers: { name: 'Name', alpha2: 'Alpha-2', alpha3: 'Alpha-3', region: 'Region', capital: 'Hauptstadt', state: 'Bundesland', population: 'Bev\u00f6lkerung', latitude: 'Breitengrad', longitude: 'L\u00e4ngengrad', code: 'Code', fractionSize: 'Nachkommastellen' }
    },
    placeDetail: {
      loadFailed: 'Details konnten nicht geladen werden', loginToWishlist: 'Melden Sie sich an, um Orte zu speichern',
      wishlistAdded: 'Zur Wunschliste hinzugef\u00fcgt', wishlistFailed: 'Wunschliste konnte nicht aktualisiert werden',
      notFound: 'Ort nicht gefunden.', backToExplore: 'Zur\u00fcck zur Erkundung',
      inWishlist: 'In Wunschliste', addToWishlist: 'Zur Wunschliste hinzuf\u00fcgen',
      noDescription: 'Noch keine Beschreibung f\u00fcr diesen Ort verf\u00fcgbar.',
      type: 'Typ', city: 'Stadt', rating: 'Bewertung', notRatedYet: 'Noch nicht bewertet',
      reviews: 'Bewertungen', reviewsCount: 'Bewertungen', planTrip: 'Reise hierher planen'
    },
    tripPlanner: {
      savedPlans: 'Gespeicherte Pl\u00e4ne',
      sharing: { facebook: 'Facebook', twitter: 'Twitter', whatsapp: 'WhatsApp' },
      form: { styles: { cultural: 'Kulturell' } },
      placeTypes: { historical: 'Historisch', restaurant: 'Restaurant', museum: 'Museum', park: 'Park', shop: 'Gesch\u00e4ft', hotel: 'Hotel' },
      calendar: { googleCalendar: 'Google Kalender', appleCalendar: 'Apple Kalender', outlook: 'Outlook' },
      weather: { temperature: '{{temp}}\u00b0C', temperatureF: '{{temp}}\u00b0F', condition: '{{condition}}', wind: 'Wind: {{value}} km/h', humidity: 'Luftfeuchtigkeit: {{value}}%', packed: 'Nicht vergessen einzupacken: {{items}}' },
      title: 'KI-Reiseplaner', subtitle: 'Planen Sie Ihre perfekte Reise'
    },
    navigation: { hotels: 'Hotels', restaurants: 'Restaurants', blog: 'Blog', faq: 'FAQ', support: 'Support', cookies: 'Cookies' },
    time: { am: 'AM', pm: 'PM' },
    dates: {
      format: 'DD.MM.YYYY', formatLong: 'DD. MMMM YYYY', formatShort: 'DD. MMM', formatWithTime: 'DD.MM.YYYY HH:mm',
      months: { january: 'Januar', february: 'Februar', march: 'M\u00e4rz', april: 'April', may: 'Mai', june: 'Juni', july: 'Juli', august: 'August', september: 'September', october: 'Oktober', november: 'November', december: 'Dezember' },
      monthsShort: { january: 'Jan', february: 'Feb', march: 'M\u00e4r', april: 'Apr', may: 'Mai', june: 'Jun', july: 'Jul', august: 'Aug', september: 'Sep', october: 'Okt', november: 'Nov', december: 'Dez' }
    },
    currency: { eur: 'Euro' },
    units: { km: 'km', mi: 'mi', m: 'm', ft: 'ft', kg: 'kg', lb: 'lb', l: 'L', gal: 'gal', kph: 'km/h', mph: 'mph' },
    discover: {
      description: 'Diese Seite konzentriert sich auf die Entdeckung. Durchsuchen Sie den Katalog, suchen Sie \u00f6ffentliche Anbieter und \u00f6ffnen Sie Details ohne soziales Rauschen.',
      searchHeading: '\u00d6ffentlichen Katalog durchsuchen', searchPlaceholder: 'Suche Anbieter, Orte und Veranstaltungen',
      eventsTab: 'Veranstaltungen', allTab: 'Alle', noEventsMessage: 'Derzeit keine bevorstehenden Veranstaltungen.'
    }
  },

  // ─── CHINESE ───
  zh: {
    provider: {
      places: { typeAndRating: '{{type}} \u00b7 {{rating}} \u2605', table: { image: '' } }
    },
    admin: { countries: { alpha2: 'Alpha-2', alpha3: 'Alpha-3' } },
    geo: { headers: { alpha2: 'Alpha-2', alpha3: 'Alpha-3' } },
    tripPlanner: { weather: { temperature: '{{temp}}\u00b0C', temperatureF: '{{temp}}\u00b0F', condition: '{{condition}}' } }
  },

  // ─── PORTUGUESE ───
  pt: {
    destinations: {
      labels: { capital: 'Capital:' },
      regions: { asia: '\u00c1sia', europe: 'Europa', africa: '\u00c1frica', americas: 'Am\u00e9ricas', oceania: 'Oceania' }
    },
    navbar: { social: 'Social' },
    provider: {
      sidebar: { feed: 'Feed' },
      places: { typeAndRating: '{{type}} \u00b7 {{rating}} \u2605', table: { image: '' } },
      bookings: { columns: { total: 'Total' } },
      profile: { fields: { slug: 'Slug' }, providerTypes: { HOTEL: 'Hotel' } }
    },
    admin: { common: { totalItems: 'Total' }, places: { slug: 'Slug' } },
    common: { no: 'N\u00e3o', ok: 'OK' },
    geo: { headers: { capital: 'Capital' } },
    tripPlanner: {
      form: { styles: { cultural: 'Cultural' } },
      placeTypes: { hotel: 'Hotel' },
      weather: { temperature: '{{temp}}\u00b0C', temperatureF: '{{temp}}\u00b0F', condition: '{{condition}}' }
    },
    navigation: { blog: 'Blog', cookies: 'Cookies' },
    time: { am: 'AM', pm: 'PM' },
    dates: {
      monthsShort: {
        january: 'Jan', february: 'Fev', march: 'Mar', april: 'Abr', may: 'Mai',
        june: 'Jun', july: 'Jul', august: 'Ago', september: 'Set', october: 'Out',
        november: 'Nov', december: 'Dez'
      }
    },
    currency: { eur: 'Euro' },
    units: { km: 'km', mi: 'mi', m: 'm', ft: 'ft', kg: 'kg', lb: 'lb', l: 'L', gal: 'gal', kph: 'km/h', mph: 'mph' }
  }
};

function deepMerge(t, s) {
  const r = { ...t };
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      r[k] = deepMerge(r[k] || {}, s[k]);
    } else {
      r[k] = s[k];
    }
  }
  return r;
}

const en = JSON.parse(fs.readFileSync(localeDir + '/en/translation.json', 'utf8'));

for (const [lang, data] of Object.entries(fixes)) {
  const fp = localeDir + '/' + lang + '/translation.json';
  const t = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const merged = deepMerge(t, data);
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  // Check remaining
  function getLeafKeys(o, p = '', res = {}) {
    for (const k of Object.keys(o)) { const fp2 = p ? p + '.' + k : k; if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) getLeafKeys(o[k], fp2, res); else res[fp2] = o[k]; }
    return res;
  }
  const enLeaf = getLeafKeys(en);
  const newLeaf = getLeafKeys(merged);
  const stillEn = Object.entries(newLeaf).filter(([k, v]) => enLeaf[k] !== undefined && enLeaf[k] === v);
  // Filter untranslatables
  const untranslatables = new Set(['0', '*', 'support@waynest.com', 'Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp', 'Google Calendar', 'Apple Calendar', 'Outlook', 'Google Agenda', 'Apple Agenda', '']);
  const real = stillEn.filter(([k, v]) => !untranslatables.has(v) && v !== '');
  console.log(lang + ': ' + real.length + ' truly translatable English keys remaining');
  if (real.length > 0) real.slice(0, 15).forEach(([k, v]) => console.log('  ' + k + ' = ' + v));
}
console.log('\nDone');
