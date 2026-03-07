import type { NextApiRequest, NextApiResponse } from 'next';

const HUBSPOT_BASE = 'https://api.hubapi.com';

async function fetchObjects(path: string, token: string) {
  const resp = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`HubSpot API returned ${resp.status}`);
  }
  return resp.json();
}

function toCalendarEvents(results: any[], type: string, portalId: string) {
  return results.map((item) => {
    const props = item.properties || {};
    const start = props.startTime || props.dueDate || props.timestamp;
    const title = props.subject || props.summary || type;
    const url = `https://app.hubspot.com/contacts/${portalId}/record/${type}/${item.id}`;
    let color;
    switch (type) {
      case 'meetings':
        color = 'blue';
        break;
      case 'calls':
        color = 'green';
        break;
      case 'tasks':
        color = 'orange';
        break;
      default:
        color = '';
    }
    return { id: item.id, title, start, url, color, extendedProps: item };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type = 'all' } = req.query;
  const token = process.env.HUBSPOT_TOKEN;
  const portal = process.env.HUBSPOT_PORTAL_ID;
  if (!token || !portal) {
    res.status(500).json({ error: 'Missing HUBSPOT_TOKEN or HUBSPOT_PORTAL_ID' });
    return;
  }

  try {
    const types = type === 'all' ? ['meetings', 'calls', 'tasks'] : [type.toString()];
    const allEvents: any[] = [];
    for (const t of types) {
      let path = `/crm/v3/objects/${t}?archived=false&limit=100`;
      // optionally add property filters / date range
      const data: any = await fetchObjects(path, token);
      if (data.results) {
        allEvents.push(...toCalendarEvents(data.results, t, portal));
      }
    }
    res.status(200).json(allEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch from HubSpot' });
  }
}
