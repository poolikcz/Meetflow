import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthContext, getOAuthSettings, refreshAccessToken, setAuthCookies } from '../../lib/hubspotAuth';

const HUBSPOT_BASE = 'https://api.hubapi.com';

class HubSpotApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchObjects(path: string, token: string) {
  const resp = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new HubSpotApiError(resp.status, `HubSpot API returned ${resp.status}`);
  }
  return resp.json();
}

function toCalendarEvents(results: any[], type: string, portalId?: string) {
  return results.map((item) => {
    const props = item.properties || {};
    const start = props.startTime || props.dueDate || props.timestamp;
    const title = props.subject || props.summary || type;
    const url = portalId
      ? `https://app.hubspot.com/contacts/${portalId}/record/${type}/${item.id}`
      : undefined;
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
  const auth = getAuthContext(req);

  let token = auth.accessToken || process.env.HUBSPOT_TOKEN;
  let portal = auth.portalId || process.env.HUBSPOT_PORTAL_ID;

  if (!token) {
    res.status(401).json({
      error: 'HubSpot account is not connected',
      authUrl: '/api/oauth/start',
    });
    return;
  }

  try {
    const types = type === 'all' ? ['meetings', 'calls', 'tasks'] : [type.toString()];
    const allEvents: any[] = [];

    for (const t of types) {
      const path = `/crm/v3/objects/${t}?archived=false&limit=100`;
      let data: any;

      try {
        data = await fetchObjects(path, token);
      } catch (err) {
        if (
          err instanceof HubSpotApiError &&
          err.status === 401 &&
          auth.refreshToken
        ) {
          const settings = getOAuthSettings(req);
          const refreshed = await refreshAccessToken(auth.refreshToken, settings);
          setAuthCookies(res, refreshed);
          token = refreshed.access_token;
          if (refreshed.hub_id) {
            portal = String(refreshed.hub_id);
          }
          data = await fetchObjects(path, token);
        } else {
          throw err;
        }
      }

      if (data.results) {
        allEvents.push(...toCalendarEvents(data.results, t, portal));
      }
    }

    res.status(200).json(allEvents);
  } catch (err) {
    console.error(err);

    if (err instanceof HubSpotApiError && err.status === 401) {
      res.status(401).json({
        error: 'HubSpot authorization expired',
        authUrl: '/api/oauth/start',
      });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch from HubSpot' });
  }
}
