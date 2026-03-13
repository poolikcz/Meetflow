import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

type ActivityType = 'meetings' | 'calls' | 'tasks';

const FILTER_OPTIONS: Array<{ key: ActivityType; label: string }> = [
  { key: 'meetings', label: 'Schůzky' },
  { key: 'calls', label: 'Volání' },
  { key: 'tasks', label: 'Úkoly' },
];

const TYPE_COLORS: Record<ActivityType, string> = {
  meetings: 'blue',
  calls: 'green',
  tasks: 'gold',
};

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

interface SelectedEventDetail {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  activityType?: ActivityType;
  ownerId?: string;
  ownerName?: string;
  description?: string;
}

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
          ownerState[owner.id] = true;
        });
        setSelectedOwners(ownerState);
      } catch {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const visibleEvents = events.filter((event) => {
    const type = event.extendedProps?.activityType as ActivityType | undefined;
    if (!type || !selectedTypes[type]) {
      return false;
    }

    // If there are owners, filter by owner. If no owners exist, show all.
    if (owners.length > 0) {
      const ownerId = event.extendedProps?.ownerId;
      if (ownerId && !selectedOwners[ownerId]) {
        return false;
      }
    }

    return true;
  });

  const toggleType = (type: ActivityType) => {
    setSelectedTypes((previous) => ({
      ...previous,
      [type]: !previous[type],
    }));
  };

  const toggleOwner = (ownerId: string) => {
    setSelectedOwners((previous) => ({
      ...previous,
      [ownerId]: !previous[ownerId],
    }));
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return '-';
    }

    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return value;
    }

    return asDate.toLocaleString('cs-CZ');
  };

  const getTypeLabel = (type?: ActivityType) => {
    if (!type) {
      return '-';
    }

    const option = FILTER_OPTIONS.find((item) => item.key === type);
    return option?.label || type;
  };

  const getOwnerLabel = (ownerId?: string, ownerName?: string) => {
    if (ownerName) {
      return ownerName;
    }

    if (!ownerId) {
      return '-';
    }

    const owner = owners.find((item) => item.id === ownerId);
    return owner?.label || `Owner ${ownerId}`;
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

  if (loading) {
    return <p>Loading…</p>;
  }

  if (authUrl) {
    return (
      <p>
        {error || 'HubSpot account is not connected.'} <a href={authUrl}>Reconnect HubSpot</a>
      </p>
    );
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (events.length === 0) {
    return <p>No meetings, calls, or tasks were found in HubSpot for this account.</p>;
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((option) => (
          <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={selectedTypes[option.key]}
              onChange={() => toggleType(option.key)}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: TYPE_COLORS[option.key],
                display: 'inline-block',
              }}
            />
            {option.label}
          </label>
        ))}
      </div>

      {owners.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {owners.map((owner) => (
            <label key={owner.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedOwners[owner.id] ?? true}
                onChange={() => toggleOwner(owner.id)}
              />
              {owner.label}
            </label>
          ))}
        </div>
      )}

      {visibleEvents.length === 0 ? (
        <p>Pro vybrané filtry nejsou dostupné žádné události.</p>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={visibleEvents}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
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

                setSelectedEvent({
                  id: info.event.id,
                  title: info.event.title,
                  start: info.event.start?.toISOString() || '',
                  end: info.event.end?.toISOString(),
                  url: info.event.url,
                  activityType: extendedProps.activityType as ActivityType | undefined,
                  ownerId: extendedProps.ownerId,
                  ownerName: extendedProps.ownerName,
                  description,
                });
              }}
            />
          </div>

          {selectedEvent && (
            <aside style={{ width: 320, border: '1px solid', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>Detail záznamu</strong>
                <button type="button" onClick={() => setSelectedEvent(null)}>
                  Zavřít
                </button>
              </div>

              <h3 style={{ marginTop: 12, marginBottom: 8 }}>{selectedEvent.title}</h3>
              <p><strong>Typ:</strong> {getTypeLabel(selectedEvent.activityType)}</p>
              <p><strong>Začátek:</strong> {formatDate(selectedEvent.start)}</p>
              <p><strong>Konec:</strong> {formatDate(selectedEvent.end)}</p>
              <p>
                <strong>Owner:</strong>{' '}
                {getOwnerLabel(selectedEvent.ownerId, selectedEvent.ownerName)}
              </p>

              {selectedEvent.description && (
                <div>
                  <strong>Poznámka:</strong>
                  <div
                    style={{ marginTop: 6 }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEvent.description) }}
                  />
                </div>
              )}

              {selectedEvent.url && (
                <p>
                  <a href={selectedEvent.url} target="_blank" rel="noreferrer">
                    Otevřít záznam v HubSpot
                  </a>
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </>
  );
};

export default CalendarView;
