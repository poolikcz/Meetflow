import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

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

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);
      setAuthUrl(null);

      try {
        const response = await fetch('/api/events?type=all');
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 && data?.authUrl) {
            setAuthUrl(data.authUrl);
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

  if (loading) {
    return <p>Loading…</p>;
  }

  if (authUrl) {
    return (
      <p>
        HubSpot account is not connected. <a href={authUrl}>Connect HubSpot</a>
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
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      events={events}
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
  );
};

export default CalendarView;
