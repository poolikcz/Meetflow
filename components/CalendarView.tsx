import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import csLocale from '@fullcalendar/core/locales/cs';
import deLocale from '@fullcalendar/core/locales/de';
import esLocale from '@fullcalendar/core/locales/es';
import {
  AlertCircle,
  ExternalLink,
  Filter,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  UserCircle2,
} from 'lucide-react';
import { useSettingsContext } from '../lib/SettingsContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';
import { getTranslations } from '../lib/translations';

type ActivityType = 'meetings' | 'calls' | 'tasks';

const FILTER_OPTIONS: Array<{
  key: ActivityType;
  dotClass: string;
  badgeClass: string;
}> = [
  {
    key: 'meetings',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
  },
  {
    key: 'calls',
    dotClass: 'bg-green-500',
    badgeClass: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200',
  },
  {
    key: 'tasks',
    dotClass: 'bg-yellow-500',
    badgeClass: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  },
];

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  color?: string;
  extendedProps?: any;
}

interface Owner {
  id: string;
  label: string;
}

function normalizeOwnerKey(value?: string) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+\.0+$/.test(trimmed)) {
    return trimmed.replace(/\.0+$/, '');
  }

  return trimmed;
}

interface SelectedEventDetail {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  activityType?: ActivityType;
  ownerId?: string;
  ownerName?: string;
  sourceLabel?: string;
  description?: string;
}

const CALENDAR_LOCALES = [csLocale, deLocale, esLocale];

const CALENDAR_HEADER_TOOLBAR = {
  left: 'prev,next today',
  center: 'title',
  right: 'dayGridMonth,timeGridWeek,timeGridDay',
} as const;

const VISUAL_STACK_MINUTES = 5;

interface CalendarPaneProps {
  visibleEvents: CalendarEvent[];
  noResultsTitle: string;
  noResultsDescription: string;
  calendarLocale: string;
  calendarUses12h: boolean;
  layoutSignature: string;
  onEventClick: (detail: SelectedEventDetail) => void;
}

const CalendarPane = memo(function CalendarPane({
  visibleEvents,
  noResultsTitle,
  noResultsDescription,
  calendarLocale,
  calendarUses12h,
  layoutSignature,
  onEventClick,
}: CalendarPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');

  const updateCalendarSize = useCallback(() => {
    calendarRef.current?.getApi().updateSize();
  }, []);

  useEffect(() => {
    updateCalendarSize();

    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        updateCalendarSize();
      });
    });

    observer.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [updateCalendarSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      updateCalendarSize();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [layoutSignature, updateCalendarSize]);

  const timeFormat = useMemo(
    () => ({
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      hour12: calendarUses12h,
    }),
    [calendarUses12h]
  );

  const renderedEvents = useMemo(() => {
    const useStackedTimedEvents = currentView === 'timeGridWeek' || currentView === 'timeGridDay';

    if (!useStackedTimedEvents) {
      return visibleEvents;
    }

    const seenByStartKey = new Map<string, number>();

    return visibleEvents.map((event) => {
      const activityType = event.extendedProps?.activityType as ActivityType | undefined;

      if (activityType === 'meetings') {
        return event;
      }

      const startDate = event.start ? new Date(event.start) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) {
        return event;
      }

      const dayKey = `${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDate()}`;
      const startKey = `${dayKey}-${startDate.getHours()}-${startDate.getMinutes()}`;
      const stackIndex = seenByStartKey.get(startKey) || 0;
      seenByStartKey.set(startKey, stackIndex + 1);

      const visualStart = new Date(startDate);
      visualStart.setMinutes(visualStart.getMinutes() + stackIndex * VISUAL_STACK_MINUTES);

      const originalEnd = event.end ? new Date(event.end) : null;
      const visualEnd = new Date(visualStart);
      const fallbackDurationMinutes = VISUAL_STACK_MINUTES;

      if (originalEnd && !Number.isNaN(originalEnd.getTime()) && originalEnd > startDate) {
        const durationMinutes = Math.max(
          fallbackDurationMinutes,
          Math.round((originalEnd.getTime() - startDate.getTime()) / 60000)
        );
        visualEnd.setMinutes(visualEnd.getMinutes() + durationMinutes);
      } else {
        visualEnd.setMinutes(visualEnd.getMinutes() + fallbackDurationMinutes);
      }

      return {
        ...event,
        start: visualStart.toISOString(),
        end: visualEnd.toISOString(),
        extendedProps: {
          ...event.extendedProps,
          originalTitle: event.title,
          originalStart: event.start,
          originalEnd: event.end,
        },
      };
    });
  }, [currentView, visibleEvents]);

  return (
    <div className="min-w-0 flex-1 space-y-4">
      {visibleEvents.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{noResultsTitle}</AlertTitle>
          <AlertDescription>{noResultsDescription}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-2 md:p-3">
          <div ref={containerRef} className="h-[70vh] min-h-[560px] xl:h-[calc(100vh-170px)] xl:min-h-[720px]">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locales={CALENDAR_LOCALES}
              locale={calendarLocale}
              initialView="dayGridMonth"
              events={renderedEvents}
              height="100%"
              expandRows
              scrollTimeReset={false}
              displayEventTime={false}
              eventOrder="start,title"
              eventMinHeight={18}
              eventTimeFormat={timeFormat}
              slotLabelFormat={timeFormat}
              headerToolbar={CALENDAR_HEADER_TOOLBAR}
              datesSet={(info) => {
                setCurrentView(info.view.type);
              }}
              eventClick={(info) => {
                info.jsEvent.preventDefault();

                const extendedProps = info.event.extendedProps || {};
                const properties = extendedProps.properties || {};
                const description =
                  properties.hs_meeting_body ||
                  properties.hs_call_body ||
                  properties.hs_task_body ||
                  undefined;

                onEventClick({
                  id: info.event.id,
                  title: extendedProps.originalTitle || info.event.title,
                  start: extendedProps.originalStart || info.event.start?.toISOString() || '',
                  end: extendedProps.originalEnd || info.event.end?.toISOString(),
                  url: info.event.url,
                  activityType: extendedProps.activityType as ActivityType | undefined,
                  ownerId: extendedProps.ownerId,
                  ownerName: extendedProps.ownerName,
                  sourceLabel: extendedProps.sourceLabel,
                  description,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

const CalendarView = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Record<ActivityType, boolean>>({
    meetings: true,
    calls: true,
    tasks: true,
  });
  const [selectedOwners, setSelectedOwners] = useState<Record<string, boolean>>({});
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventDetail | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [isDetailVisible, setIsDetailVisible] = useState(true);
  const { settings } = useSettingsContext();
  const t = getTranslations(settings.language);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);
      setAuthUrl(null);

      try {
        const response = await fetch('/api/events?type=all');
        const data = await response.json();

        if (!response.ok) {
          if (data?.authUrl) {
            setAuthUrl(data.authUrl);
            setError(data?.error || null);
            setEvents([]);
            setOwners([]);
            return;
          }

          setError(data?.error || 'Failed to load events');
          setEvents([]);
          setOwners([]);
          return;
        }

        // Handle both old format (array) and new format (object with events/owners)
        const eventList = data.events || (Array.isArray(data) ? data : []);
        const ownerList = data.owners || [];

        setEvents(eventList);
        setOwners(ownerList);

        // Initialize selectedOwners state with all owners enabled
        const ownerState: Record<string, boolean> = {};
        ownerList.forEach((owner: Owner) => {
          const normalizedOwnerId = normalizeOwnerKey(owner.id);
          if (normalizedOwnerId) {
            ownerState[normalizedOwnerId] = true;
          }
        });
        setSelectedOwners(ownerState);
      } catch {
        setError(t.loadErrorTitle);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [t.loadErrorTitle]);

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        const type = event.extendedProps?.activityType as ActivityType | undefined;
        if (!type || !selectedTypes[type]) {
          return false;
        }

        if (owners.length > 0) {
          const ownerId = normalizeOwnerKey(event.extendedProps?.ownerId);
          if (ownerId && !selectedOwners[ownerId]) {
            return false;
          }
        }

        return true;
      }),
    [events, owners.length, selectedOwners, selectedTypes]
  );

  const formatDate = (value?: string) => {
    if (!value) {
      return '-';
    }

    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return value;
    }

    const is12h = settings.timeFormat === '12h';
    const day = String(asDate.getDate()).padStart(2, '0');
    const month = String(asDate.getMonth() + 1).padStart(2, '0');
    const year = String(asDate.getFullYear());
    const datePart = settings.dateFormat === 'us' ? `${month}/${day}/${year}` : `${day}.${month}.${year}`;
    const timePart = new Intl.DateTimeFormat(dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: is12h,
    }).format(asDate);

    return `${datePart} ${timePart}`;
  };

  const getTypeLabel = (type?: ActivityType) => {
    if (!type) {
      return '-';
    }

    const option = FILTER_OPTIONS.find((item) => item.key === type);
    return option ? t.activityTypes[option.key] : type;
  };

  const getTypeMeta = (type?: ActivityType) => {
    if (!type) {
      return null;
    }

    return FILTER_OPTIONS.find((option) => option.key === type) || null;
  };

  const getOwnerLabel = (ownerId?: string, ownerName?: string) => {
    if (ownerName) {
      return ownerName;
    }

    const normalizedOwnerId = normalizeOwnerKey(ownerId);

    if (!normalizedOwnerId) {
      return '-';
    }

    const owner = owners.find((item) => normalizeOwnerKey(item.id) === normalizedOwnerId);
    return owner?.label || `${t.unknownOwner} ${normalizedOwnerId}`;
  };

  const sanitizeHtml = (input?: string) => {
    if (!input) {
      return '';
    }

    if (typeof window === 'undefined') {
      return input;
    }

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(input, 'text/html');

    documentNode
      .querySelectorAll('script, style, iframe, object, embed, link, meta')
      .forEach((node) => node.remove());

    documentNode.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();

        if (name.startsWith('on')) {
          element.removeAttribute(attribute.name);
          return;
        }

        if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return documentNode.body.innerHTML;
  };

  const calendarLocale = t.calendarLocale;
  const calendarUses12h = settings.timeFormat === '12h';
  const dateLocale =
    settings.language === 'de'
      ? 'de-DE'
      : settings.language === 'es'
        ? 'es-ES'
        : settings.language === 'en'
          ? 'en-US'
          : 'cs-CZ';

  const handleCalendarEventClick = useCallback((detail: SelectedEventDetail) => {
    setSelectedEvent(detail);
    setIsDetailVisible(true);
  }, []);

  const layoutSignature = `${isFilterVisible}-${isDetailVisible}`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.loadingTitle}</CardTitle>
          <CardDescription>{t.loadingDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (authUrl) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t.disconnectedTitle}</AlertTitle>
        <AlertDescription>{error || t.disconnectedDescription}</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t.loadErrorTitle}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.noDataTitle}</CardTitle>
          <CardDescription>{t.noDataDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        {isFilterVisible && (
          <Card className="h-fit xl:sticky xl:top-6 xl:w-[300px] xl:shrink-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    {t.filterTitle}
                  </CardTitle>
                  <CardDescription className="mt-1">{t.filterDescription}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFilterVisible(false)}
                  title={t.hideFilter}
                >
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="sr-only">{t.hideFilter}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">{t.recordTypeLabel}</p>
                {FILTER_OPTIONS.map((option) => (
                  <label key={option.key} className="flex cursor-pointer items-center gap-3 text-sm">
                    <Checkbox
                      checked={selectedTypes[option.key]}
                      onCheckedChange={(checked) => {
                        setSelectedTypes((previous) => ({
                          ...previous,
                          [option.key]: checked === true,
                        }));
                      }}
                    />
                    <span className={cn('h-2.5 w-2.5 rounded-full', option.dotClass)} />
                    <span>{t.activityTypes[option.key]}</span>
                  </label>
                ))}
              </div>

              {owners.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t.ownerLabel}</p>
                    <ScrollArea className="h-48 pr-3">
                      <div className="space-y-2">
                        {owners.map((owner) => (
                          <label key={owner.id} className="flex cursor-pointer items-center gap-3 text-sm">
                            <Checkbox
                              checked={selectedOwners[normalizeOwnerKey(owner.id) || owner.id] ?? true}
                              onCheckedChange={(checked) => {
                                const normalizedOwnerId = normalizeOwnerKey(owner.id) || owner.id;
                                setSelectedOwners((previous) => ({
                                  ...previous,
                                  [normalizedOwnerId]: checked === true,
                                }));
                              }}
                            />
                            <span className="truncate">{owner.label}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!isFilterVisible && (
          <Card className="h-fit xl:sticky xl:top-6 xl:w-[52px] xl:shrink-0">
            <CardContent className="p-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFilterVisible(true)}
                title={t.showFilter}
              >
                <PanelLeftOpen className="h-4 w-4" />
                <span className="sr-only">{t.showFilter}</span>
              </Button>
            </CardContent>
          </Card>
        )}

        <CalendarPane
          visibleEvents={visibleEvents}
          noResultsTitle={t.noResultsTitle}
          noResultsDescription={t.noResultsDescription}
          calendarLocale={calendarLocale}
          calendarUses12h={calendarUses12h}
          layoutSignature={layoutSignature}
          onEventClick={handleCalendarEventClick}
        />

        {isDetailVisible && (
          <Card className="h-fit xl:sticky xl:top-6 xl:w-[360px] xl:shrink-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{t.detailTitle}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedEvent?.sourceLabel || t.detailEmptyDescription}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsDetailVisible(false)}
                  title={t.hideDetail}
                >
                  <PanelRightClose className="h-4 w-4" />
                  <span className="sr-only">{t.hideDetail}</span>
                </Button>
              </div>
            </CardHeader>
            {selectedEvent ? (
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold leading-tight">{selectedEvent.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.activityType && (
                      <Badge
                        variant="outline"
                        className={cn(getTypeMeta(selectedEvent.activityType)?.badgeClass)}
                      >
                        {getTypeLabel(selectedEvent.activityType)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      {getOwnerLabel(selectedEvent.ownerId, selectedEvent.ownerName)}
                    </Badge>
                  </div>
                </div>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground">{t.startLabel}</p>
                      <p className="font-medium">{formatDate(selectedEvent.start)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">{t.endLabel}</p>
                      <p className="font-medium">{formatDate(selectedEvent.end)}</p>
                    </div>
                  </CardContent>
                </Card>

                {selectedEvent.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t.noteLabel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEvent.description) }}
                      />
                    </CardContent>
                  </Card>
                )}

                {selectedEvent.url && (
                  <Button asChild className="w-full">
                    <a href={selectedEvent.url} target="_blank" rel="noreferrer">
                      {t.openRecord}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.detailPlaceholder}</p>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </>
  );
};

export default CalendarView;
