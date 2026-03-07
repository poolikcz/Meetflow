import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthContext, getOAuthSettings, refreshAccessToken, setAuthCookies } from '../../lib/hubspotAuth';

const HUBSPOT_BASE = 'https://api.hubapi.com';

const OBJECT_CONFIG: Record<string, { properties: string[]; scopeHint: string }> = {
  meetings: {
    properties: ['hs_timestamp', 'hs_meeting_start_time', 'hs_meeting_end_time', 'hs_meeting_title', 'hs_meeting_body'],
    scopeHint: 'crm.objects.meetings.read',
  },
  calls: {
    properties: ['hs_timestamp', 'hs_call_title', 'hs_call_body'],
    scopeHint: 'crm.objects.calls.read',
  },
  tasks: {
    properties: ['hs_timestamp', 'hs_task_subject', 'hs_task_body'],
    scopeHint: 'crm.objects.tasks.read',
  },
};

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
  const payload = await resp.json().catch(() => null);

  if (!resp.ok) {
    const detail = payload && typeof payload.message === 'string' ? payload.message : undefined;
    const errorText = detail
      ? `HubSpot API returned ${resp.status}: ${detail}`
      : `HubSpot API returned ${resp.status}`;
    throw new HubSpotApiError(resp.status, errorText);
  }

  return payload;
}

function parseHubSpotDate(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? undefined : asDate.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (/^\d+$/.test(trimmed)) {
      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber)) {
        const asDate = new Date(asNumber);
        if (!Number.isNaN(asDate.getTime())) {
          return asDate.toISOString();
        }
      }
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function toCalendarEvents(results: any[], type: string, portalId?: string) {
  return results
    .map((item) => {
    const props = item.properties || {};
    const start = parseHubSpotDate(
      props.hs_timestamp || props.hs_meeting_start_time || props.createdate
    );

    const title =
      props.hs_meeting_title ||
      props.hs_call_title ||
      props.hs_task_subject ||
      props.subject ||
      props.summary ||
      type;

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

    if (!start) {
      return null;
    }

    return { id: item.id, title, start, url, color, extendedProps: item };
  })
    .filter(Boolean);
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
    const warnings: string[] = [];

    for (const t of types) {
      const config = OBJECT_CONFIG[t] || { properties: [], scopeHint: '' };
      const params = new URLSearchParams({
        archived: 'false',
        limit: '100',
      });
      if (config.properties.length) {
        params.set('properties', config.properties.join(','));
      }
      const path = `/crm/v3/objects/${t}?${params.toString()}`;
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
        } else if (err instanceof HubSpotApiError && err.status === 403) {
          const scopeHint = config.scopeHint ? ` (${config.scopeHint})` : '';
          warnings.push(`No permission for ${t}${scopeHint}`);
          continue;
        } else {
          throw err;
        }
      }

      if (data.results) {
        allEvents.push(...toCalendarEvents(data.results, t, portal));
      }
    }

    if (!allEvents.length && warnings.length) {
      res.status(403).json({
        error: `Missing scopes for activities: ${warnings.join(', ')}`,
        authUrl: '/api/oauth/start',
      });
      return;
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
