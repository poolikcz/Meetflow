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

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  color?: string;
  extendedProps?: any;
}

const CalendarView = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Record<ActivityType, boolean>>({
    meetings: true,
    calls: true,
    tasks: true,
  });

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
            return;
          }

          setError(data?.error || 'Failed to load events');
          setEvents([]);
          return;
        }

        setEvents(Array.isArray(data) ? data : []);
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
    if (!type) {
      return true;
    }
    return selectedTypes[type];
  });

  const toggleType = (type: ActivityType) => {
    setSelectedTypes((previous) => ({
      ...previous,
      [type]: !previous[type],
    }));
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
            {option.label}
          </label>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <p>Pro vybrané filtry nejsou dostupné žádné události.</p>
      ) : (
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
            if (info.event.url) {
              window.open(info.event.url, '_blank');
              info.jsEvent.preventDefault();
            }
          }}
        />
      )}
    </>
  );
};

export default CalendarView;
