import type { Language } from './useSettings';

export interface TranslationMessages {
  appTitle: string;
  appDescription: string;
  settingsLabel: string;
  settingsTitle: string;
  languageLabel: string;
  dateFormatLabel: string;
  timeFormatLabel: string;
  weekendsLabel: string;
  showWeekendsLabel: string;
  hideWeekendsLabel: string;
  themeToggleLabel: string;
  filterTitle: string;
  filterDescription: string;
  hideFilter: string;
  showFilter: string;
  recordTypeLabel: string;
  ownerLabel: string;
  loadingTitle: string;
  loadingDescription: string;
  disconnectedTitle: string;
  disconnectedDescription: string;
  reconnectHubSpot: string;
  loadErrorTitle: string;
  noDataTitle: string;
  noDataDescription: string;
  ownerReconnectTitle: string;
  ownerReconnectDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  detailTitle: string;
  detailEmptyDescription: string;
  hideDetail: string;
  startLabel: string;
  endLabel: string;
  noteLabel: string;
  openRecord: string;
  detailPlaceholder: string;
  unknownOwner: string;
  activityTypes: Record<'meetings' | 'calls' | 'tasks', string>;
  languages: Record<Language, string>;
  calendarLocale: 'cs' | 'en' | 'de' | 'es';
  pageTitle: string;
}

const translations: Record<Language, TranslationMessages> = {
  cs: {
    appTitle: 'HubSpot Kalendář',
    pageTitle: 'HubSpot Kalendář',
    appDescription: 'Přehled schůzek, telefonátů a úkolů s chytrou filtrací a detailním náhledem.',
    settingsLabel: 'Nastavení',
    settingsTitle: 'Nastavení zobrazení',
    languageLabel: 'Jazyk prostředí',
    dateFormatLabel: 'Formát data',
    timeFormatLabel: 'Formát času',
    weekendsLabel: 'Víkendové dny',
    showWeekendsLabel: 'Zobrazit sobotu a neděli',
    hideWeekendsLabel: 'Skrýt sobotu a neděli',
    themeToggleLabel: 'Přepnout motiv',
    filterTitle: 'Filtrace',
    filterDescription: 'Vyberte, co se má zobrazit v kalendáři.',
    hideFilter: 'Skrýt filtraci',
    showFilter: 'Zobrazit filtraci',
    recordTypeLabel: 'Typ záznamu',
    ownerLabel: 'Owner',
    loadingTitle: 'Načítání kalendáře',
    loadingDescription: 'Stahuji data z HubSpotu…',
    disconnectedTitle: 'HubSpot není připojený',
    disconnectedDescription: 'HubSpot účet není připojený.',
    reconnectHubSpot: 'Reconnect HubSpot',
    loadErrorTitle: 'Chyba načtení',
    noDataTitle: 'Žádná data',
    noDataDescription: 'V HubSpotu nebyly pro tento účet nalezeny žádné schůzky, telefonáty ani úkoly.',
    ownerReconnectTitle: 'Jména ownerů vyžadují reconnect',
    ownerReconnectDescription: 'Pro načtení jmen ownerů je potřeba znovu připojit HubSpot s oprávněním pro owners.',
    noResultsTitle: 'Žádné výsledky',
    noResultsDescription: 'Pro vybrané filtry nejsou dostupné žádné události.',
    detailTitle: 'Detail záznamu',
    detailEmptyDescription: 'Klikněte na událost v kalendáři',
    hideDetail: 'Skrýt detail',
    startLabel: 'Začátek',
    endLabel: 'Konec',
    noteLabel: 'Poznámka',
    openRecord: 'Otevřít záznam v HubSpot',
    detailPlaceholder: 'Vyberte událost v kalendáři a její obsah se zobrazí tady.',
    unknownOwner: 'Owner',
    activityTypes: {
      meetings: 'Schůzky',
      calls: 'Telefonáty',
      tasks: 'Úkoly',
    },
    languages: {
      cs: 'Čeština',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
    },
    calendarLocale: 'cs',
  },
  en: {
    appTitle: 'HubSpot Calendar',
    pageTitle: 'HubSpot Calendar',
    appDescription: 'Overview of meetings, calls, and tasks with smart filters and a detailed side panel.',
    settingsLabel: 'Settings',
    settingsTitle: 'Display settings',
    languageLabel: 'Interface language',
    dateFormatLabel: 'Date format',
    timeFormatLabel: 'Time format',
    weekendsLabel: 'Weekend days',
    showWeekendsLabel: 'Show Saturday and Sunday',
    hideWeekendsLabel: 'Hide Saturday and Sunday',
    themeToggleLabel: 'Toggle theme',
    filterTitle: 'Filters',
    filterDescription: 'Choose what should be shown in the calendar.',
    hideFilter: 'Hide filters',
    showFilter: 'Show filters',
    recordTypeLabel: 'Record type',
    ownerLabel: 'Owner',
    loadingTitle: 'Loading calendar',
    loadingDescription: 'Loading data from HubSpot…',
    disconnectedTitle: 'HubSpot is not connected',
    disconnectedDescription: 'Your HubSpot account is not connected.',
    reconnectHubSpot: 'Reconnect HubSpot',
    loadErrorTitle: 'Loading error',
    noDataTitle: 'No data',
    noDataDescription: 'No meetings, calls, or tasks were found in HubSpot for this account.',
    ownerReconnectTitle: 'Owner names require reconnect',
    ownerReconnectDescription: 'Reconnect HubSpot with owners permission to load owner names.',
    noResultsTitle: 'No results',
    noResultsDescription: 'No events are available for the selected filters.',
    detailTitle: 'Record detail',
    detailEmptyDescription: 'Click an event in the calendar',
    hideDetail: 'Hide detail',
    startLabel: 'Start',
    endLabel: 'End',
    noteLabel: 'Note',
    openRecord: 'Open record in HubSpot',
    detailPlaceholder: 'Select an event in the calendar and its content will appear here.',
    unknownOwner: 'Owner',
    activityTypes: {
      meetings: 'Meetings',
      calls: 'Calls',
      tasks: 'Tasks',
    },
    languages: {
      cs: 'Čeština',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
    },
    calendarLocale: 'en',
  },
  de: {
    appTitle: 'HubSpot Kalender',
    pageTitle: 'HubSpot Kalender',
    appDescription: 'Übersicht über Meetings, Anrufe und Aufgaben mit smarten Filtern und Detailansicht.',
    settingsLabel: 'Einstellungen',
    settingsTitle: 'Anzeigeeinstellungen',
    languageLabel: 'Sprache',
    dateFormatLabel: 'Datumsformat',
    timeFormatLabel: 'Zeitformat',
    weekendsLabel: 'Wochenendtage',
    showWeekendsLabel: 'Samstag und Sonntag anzeigen',
    hideWeekendsLabel: 'Samstag und Sonntag ausblenden',
    themeToggleLabel: 'Design umschalten',
    filterTitle: 'Filter',
    filterDescription: 'Wählen Sie aus, was im Kalender angezeigt werden soll.',
    hideFilter: 'Filter ausblenden',
    showFilter: 'Filter anzeigen',
    recordTypeLabel: 'Datensatztyp',
    ownerLabel: 'Owner',
    loadingTitle: 'Kalender wird geladen',
    loadingDescription: 'Daten werden aus HubSpot geladen…',
    disconnectedTitle: 'HubSpot ist nicht verbunden',
    disconnectedDescription: 'Das HubSpot-Konto ist nicht verbunden.',
    reconnectHubSpot: 'HubSpot neu verbinden',
    loadErrorTitle: 'Ladefehler',
    noDataTitle: 'Keine Daten',
    noDataDescription: 'Für dieses Konto wurden in HubSpot keine Meetings, Anrufe oder Aufgaben gefunden.',
    ownerReconnectTitle: 'Owner-Namen erfordern eine Neuverbindung',
    ownerReconnectDescription: 'Verbinden Sie HubSpot erneut mit der Berechtigung für Owners, um Namen zu laden.',
    noResultsTitle: 'Keine Ergebnisse',
    noResultsDescription: 'Für die gewählten Filter sind keine Ereignisse verfügbar.',
    detailTitle: 'Datensatzdetail',
    detailEmptyDescription: 'Klicken Sie auf ein Ereignis im Kalender',
    hideDetail: 'Detail ausblenden',
    startLabel: 'Beginn',
    endLabel: 'Ende',
    noteLabel: 'Notiz',
    openRecord: 'Datensatz in HubSpot öffnen',
    detailPlaceholder: 'Wählen Sie ein Ereignis im Kalender aus, dann wird der Inhalt hier angezeigt.',
    unknownOwner: 'Owner',
    activityTypes: {
      meetings: 'Meetings',
      calls: 'Anrufe',
      tasks: 'Aufgaben',
    },
    languages: {
      cs: 'Čeština',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
    },
    calendarLocale: 'de',
  },
  es: {
    appTitle: 'Calendario de HubSpot',
    pageTitle: 'Calendario de HubSpot',
    appDescription: 'Resumen de reuniones, llamadas y tareas con filtros inteligentes y vista detallada.',
    settingsLabel: 'Configuración',
    settingsTitle: 'Configuración de visualización',
    languageLabel: 'Idioma de la interfaz',
    dateFormatLabel: 'Formato de fecha',
    timeFormatLabel: 'Formato de hora',
    weekendsLabel: 'Días de fin de semana',
    showWeekendsLabel: 'Mostrar sábado y domingo',
    hideWeekendsLabel: 'Ocultar sábado y domingo',
    themeToggleLabel: 'Cambiar tema',
    filterTitle: 'Filtros',
    filterDescription: 'Elige qué debe mostrarse en el calendario.',
    hideFilter: 'Ocultar filtros',
    showFilter: 'Mostrar filtros',
    recordTypeLabel: 'Tipo de registro',
    ownerLabel: 'Owner',
    loadingTitle: 'Cargando calendario',
    loadingDescription: 'Cargando datos desde HubSpot…',
    disconnectedTitle: 'HubSpot no está conectado',
    disconnectedDescription: 'La cuenta de HubSpot no está conectada.',
    reconnectHubSpot: 'Reconectar HubSpot',
    loadErrorTitle: 'Error de carga',
    noDataTitle: 'Sin datos',
    noDataDescription: 'No se encontraron reuniones, llamadas ni tareas en HubSpot para esta cuenta.',
    ownerReconnectTitle: 'Los nombres de owner requieren reconexión',
    ownerReconnectDescription: 'Vuelve a conectar HubSpot con permiso de owners para cargar los nombres.',
    noResultsTitle: 'Sin resultados',
    noResultsDescription: 'No hay eventos disponibles para los filtros seleccionados.',
    detailTitle: 'Detalle del registro',
    detailEmptyDescription: 'Haz clic en un evento del calendario',
    hideDetail: 'Ocultar detalle',
    startLabel: 'Inicio',
    endLabel: 'Fin',
    noteLabel: 'Nota',
    openRecord: 'Abrir registro en HubSpot',
    detailPlaceholder: 'Selecciona un evento en el calendario y su contenido aparecerá aquí.',
    unknownOwner: 'Owner',
    activityTypes: {
      meetings: 'Reuniones',
      calls: 'Llamadas',
      tasks: 'Tareas',
    },
    languages: {
      cs: 'Čeština',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
    },
    calendarLocale: 'es',
  },
};

export function getTranslations(language: Language): TranslationMessages {
  return translations[language] || translations.cs;
}
