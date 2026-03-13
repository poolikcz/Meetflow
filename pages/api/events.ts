import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthContext, getOAuthSettings, refreshAccessToken, setAuthCookies } from '../../lib/hubspotAuth';

const HUBSPOT_BASE = 'https://api.hubapi.com';
const PAGE_LIMIT = '100';
const MAX_PAGES_PER_TYPE = 20;
const ASSOCIATION_PAGE_LIMIT = 100;
const OWNER_PAGE_LIMIT = 500;
const MAX_OWNER_PAGES = 20;
const USER_PAGE_LIMIT = 500;
const MAX_USER_PAGES = 20;
const CRM_USER_PAGE_LIMIT = 100;
const MAX_CRM_USER_PAGES = 20;

interface CalendarOwner {
  id: string;
  label: string;
}

interface CalendarEventResponse {
  events: any[];
  owners: CalendarOwner[];
  ownerReconnectRequired?: boolean;
  ownerReconnectUrl?: string;
  ownerWarning?: string;
}

type ActivityType = 'meetings' | 'calls' | 'tasks';
type SourceObjectType = 'companies' | 'contacts' | 'deals' | 'tickets';

const SOURCE_OBJECT_TYPES: SourceObjectType[] = ['companies', 'contacts', 'deals', 'tickets'];
const URL_SOURCE_OBJECT_TYPES: SourceObjectType[] = ['contacts', 'companies', 'deals', 'tickets'];

const HUBSPOT_RECORD_OBJECT_IDS: Record<SourceObjectType, string> = {
  contacts: '0-1',
  companies: '0-2',
  deals: '0-3',
  tickets: '0-5',
};

const HUBSPOT_ACTIVITY_QUERY_PARAMS: Record<ActivityType, string> = {
  meetings: 'meetingId',
  calls: 'callId',
  tasks: 'taskId',
};

const SOURCE_OBJECT_CONFIG: Record<
  SourceObjectType,
  {
    properties: string[];
    toLabel: (properties: any, id: string) => string;
  }
> = {
  companies: {
    properties: ['name'],
    toLabel: (properties, id) => {
      const value = properties?.name;
      return typeof value === 'string' && value.trim() ? value.trim() : `Company ${id}`;
    },
  },
  contacts: {
    properties: ['firstname', 'lastname', 'email'],
    toLabel: (properties, id) => {
      const fullName = [properties?.firstname, properties?.lastname]
        .filter((value) => typeof value === 'string' && value.trim())
        .join(' ')
        .trim();

      if (fullName) {
        return fullName;
      }

      const email = properties?.email;
      if (typeof email === 'string' && email.trim()) {
        return email.trim();
      }

      return `Contact ${id}`;
    },
  },
  deals: {
    properties: ['dealname'],
    toLabel: (properties, id) => {
      const value = properties?.dealname;
      return typeof value === 'string' && value.trim() ? value.trim() : `Deal ${id}`;
    },
  },
  tickets: {
    properties: ['subject'],
    toLabel: (properties, id) => {
      const value = properties?.subject;
      return typeof value === 'string' && value.trim() ? value.trim() : `Ticket ${id}`;
    },
  },
};

const OBJECT_CONFIG: Record<
  ActivityType,
  { properties: string[]; scopeHint: string }
> = {
  meetings: {
    properties: [
      'hs_timestamp',
      'hs_meeting_start_time',
      'hs_meeting_end_time',
      'hs_meeting_title',
      'hs_meeting_body',
      'hubspot_owner_id',
    ],
    scopeHint: 'crm.objects.meetings.read',
  },
  calls: {
    properties: ['hs_timestamp', 'hs_call_title', 'hs_call_body', 'hubspot_owner_id'],
    scopeHint: 'crm.objects.calls.read',
  },
  tasks: {
    properties: ['hs_timestamp', 'hs_task_subject', 'hs_task_body', 'hubspot_owner_id'],
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

async function fetchObjects(path: string, token: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  const resp = await fetch(`${HUBSPOT_BASE}${path}`, {
    method: init?.method || 'GET',
    body: init?.body,
    headers,
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

function isActivityType(value: string): value is ActivityType {
  return value === 'meetings' || value === 'calls' || value === 'tasks';
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

function toOwnerLabel(owner: any, fallbackId: string) {
  const properties = owner?.properties || {};
  const firstName =
    owner?.firstName ||
    owner?.firstname ||
    properties?.firstname ||
    properties?.hs_given_name ||
    '';
  const lastName =
    owner?.lastName ||
    owner?.lastname ||
    properties?.lastname ||
    properties?.hs_family_name ||
    '';

  const fullName = [firstName, lastName]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim();

  if (fullName) {
    return fullName;
  }

  if (typeof properties?.hs_name === 'string' && properties.hs_name.trim()) {
    return properties.hs_name.trim();
  }

  const email = owner?.email || properties?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim();
  }

  return `Owner ${fallbackId}`;
}

function normalizeOwnerKey(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const raw = String(value).trim();
  if (!raw) {
    return undefined;
  }

  if (/^\d+\.0+$/.test(raw)) {
    return raw.replace(/\.0+$/, '');
  }

  return raw;
}

function ownerKeyCandidates(value: unknown) {
  const raw = value === undefined || value === null ? undefined : String(value).trim();
  const normalized = normalizeOwnerKey(value);
  const keys = [raw, normalized].filter((item): item is string => Boolean(item));
  return Array.from(new Set(keys));
}

function ownerLookupKeys(owner: any) {
  const properties = owner?.properties || {};
  const rawKeys = [
    owner?.id,
    owner?.ownerId,
    owner?.userId,
    owner?.userIdIncludingInactive,
    owner?.email,
    properties?.hs_internal_user_id,
    properties?.email,
  ];

  return Array.from(
    new Set(
      rawKeys.flatMap((value) => ownerKeyCandidates(value))
    )
  );
}

function userLookupKeys(user: any) {
  const rawKeys = [user?.id, user?.userId, user?.email];

  return Array.from(new Set(rawKeys.flatMap((value) => ownerKeyCandidates(value))));
}

function resolveOwnerLabel(ownerId: string, labelsByAnyOwnerKey: Record<string, string>) {
  const keys = ownerKeyCandidates(ownerId);
  for (const key of keys) {
    const label = labelsByAnyOwnerKey[key];
    if (label) {
      return label;
    }
  }

  return undefined;
}

async function fetchOwnerLabelById(
  ownerId: string,
  fetchWithRefresh: (path: string, init?: RequestInit) => Promise<any>
) {
  const crmUserProperties = [
    'firstname',
    'lastname',
    'email',
    'hs_name',
    'hs_given_name',
    'hs_family_name',
    'hs_internal_user_id',
  ].join(',');

  const candidates = [
    `/crm/v3/owners/${ownerId}`,
    `/crm/v3/owners/${ownerId}?idProperty=userId`,
    `/crm/v3/owners/${ownerId}?idProperty=userIdIncludingInactive`,
    `/settings/v3/users/${ownerId}`,
    `/crm/v3/objects/users/${ownerId}?properties=${crmUserProperties}`,
    `/crm/v3/objects/users/${ownerId}?idProperty=hs_internal_user_id&properties=${crmUserProperties}`,
  ];

  for (const path of candidates) {
    try {
      const owner = await fetchWithRefresh(path);
      const label = toOwnerLabel(owner, ownerId);
      if (label && label !== `Owner ${ownerId}`) {
        return label;
      }
    } catch (error) {
      if (error instanceof HubSpotApiError && error.status === 403) {
        throw error;
      }

      continue;
    }
  }

  return undefined;
}

async function fetchUserLabels(
  fetchWithRefresh: (path: string, init?: RequestInit) => Promise<any>
) {
  const labelsByAnyUserKey: Record<string, string> = {};
  let missingScope = false;

  const addUsersToMap = (users: any[]) => {
    users.forEach((user: any) => {
      const fallbackId = normalizeOwnerKey(user?.id) || 'unknown';
      const label = toOwnerLabel(user, fallbackId);

      userLookupKeys(user).forEach((key) => {
        labelsByAnyUserKey[key] = label;
      });
    });
  };

  try {
    let after: string | undefined;
    let page = 0;

    while (page < MAX_USER_PAGES) {
      const params = new URLSearchParams({
        limit: String(USER_PAGE_LIMIT),
      });

      if (after) {
        params.set('after', after);
      }

      const data = await fetchWithRefresh(`/settings/v3/users/?${params.toString()}`);
      const results = Array.isArray(data?.results) ? data.results : [];
      addUsersToMap(results);

      const nextAfter = data?.paging?.next?.after;
      if (!nextAfter) {
        break;
      }

      after = String(nextAfter);
      page += 1;
    }
  } catch (error) {
    if (error instanceof HubSpotApiError && error.status === 403) {
      missingScope = true;
    }
  }

  return {
    labelsByAnyUserKey,
    missingScope,
  };
}

async function fetchCrmUserLabels(
  fetchWithRefresh: (path: string, init?: RequestInit) => Promise<any>
) {
  const labelsByAnyUserKey: Record<string, string> = {};
  let missingScope = false;

  const addUsersToMap = (users: any[]) => {
    users.forEach((user: any) => {
      const fallbackId = normalizeOwnerKey(user?.id) || 'unknown';
      const label = toOwnerLabel(user, fallbackId);

      ownerLookupKeys(user).forEach((key) => {
        labelsByAnyUserKey[key] = label;
      });
    });
  };

  const properties = [
    'firstname',
    'lastname',
    'email',
    'hs_name',
    'hs_given_name',
    'hs_family_name',
    'hs_internal_user_id',
  ].join(',');

  try {
    let after: string | undefined;
    let page = 0;

    while (page < MAX_CRM_USER_PAGES) {
      const params = new URLSearchParams({
        limit: String(CRM_USER_PAGE_LIMIT),
        properties,
      });

      if (after) {
        params.set('after', after);
      }

      const data = await fetchWithRefresh(`/crm/v3/objects/users/?${params.toString()}`);
      const results = Array.isArray(data?.results) ? data.results : [];
      addUsersToMap(results);

      const nextAfter = data?.paging?.next?.after;
      if (!nextAfter) {
        break;
      }

      after = String(nextAfter);
      page += 1;
    }
  } catch (error) {
    if (error instanceof HubSpotApiError && error.status === 403) {
      missingScope = true;
    }
  }

  return {
    labelsByAnyUserKey,
    missingScope,
  };
}

async function fetchOwnerLabels(
  fetchWithRefresh: (path: string, init?: RequestInit) => Promise<any>
) {
  const labelsByAnyOwnerKey: Record<string, string> = {};
  let missingScope = false;

  const addOwnersToMap = (owners: any[]) => {
    owners.forEach((owner: any) => {
      const fallbackId = normalizeOwnerKey(owner?.id) || normalizeOwnerKey(owner?.ownerId) || 'unknown';
      const label = toOwnerLabel(owner, fallbackId);

      ownerLookupKeys(owner).forEach((key) => {
        labelsByAnyOwnerKey[key] = label;
      });
    });
  };

  try {
    for (const archived of ['false', 'true']) {
      let after: string | undefined;
      let page = 0;

      while (page < MAX_OWNER_PAGES) {
        const params = new URLSearchParams({
          archived,
          limit: String(OWNER_PAGE_LIMIT),
        });

        if (after) {
          params.set('after', after);
        }

        const data = await fetchWithRefresh(`/crm/v3/owners?${params.toString()}`);
        const results = Array.isArray(data?.results) ? data.results : [];
        addOwnersToMap(results);

        const nextAfter = data?.paging?.next?.after;
        if (!nextAfter) {
          break;
        }

        after = String(nextAfter);
        page += 1;
      }
    }
  } catch (error) {
    if (error instanceof HubSpotApiError && error.status === 403) {
      missingScope = true;
    }

    // fallback to v2 endpoint below
  }

  if (Object.keys(labelsByAnyOwnerKey).length === 0) {
    try {
      const data = await fetchWithRefresh('/owners/v2/owners?inactive=true');
      const owners = Array.isArray(data) ? data : [];
      addOwnersToMap(owners);
    } catch (error) {
      if (error instanceof HubSpotApiError && error.status === 403) {
        missingScope = true;
      }

      // no-op; handled by caller fallback
    }
  }

  return {
    labelsByAnyOwnerKey,
    missingScope,
  };
}

function getAssociatedIds(associations: any, objectType: SourceObjectType) {
  const results = associations?.[objectType]?.results;
  if (!Array.isArray(results)) {
    return [] as string[];
  }

  return results
    .map((item) => item?.id)
    .filter((id) => id !== undefined && id !== null)
    .map((id) => String(id));
}

function buildHubSpotActivityUrl(
  portalId: string | undefined,
  activityType: ActivityType,
  activityId: string,
  associations: any
) {
  if (!portalId) {
    return undefined;
  }

  for (const objectType of URL_SOURCE_OBJECT_TYPES) {
    const sourceRecordId = getAssociatedIds(associations, objectType)[0];
    if (!sourceRecordId) {
      continue;
    }

    const objectTypeId = HUBSPOT_RECORD_OBJECT_IDS[objectType];
    const queryParam = HUBSPOT_ACTIVITY_QUERY_PARAMS[activityType];
    return `https://app.hubspot.com/contacts/${portalId}/record/${objectTypeId}/${sourceRecordId}?${queryParam}=${activityId}`;
  }

  return undefined;
}

function chunkArray<T>(values: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

async function fetchSourceLabels(
  objectType: SourceObjectType,
  ids: string[],
  fetchWithRefresh: (path: string, init?: RequestInit) => Promise<any>
) {
  const labelsById: Record<string, string> = {};
  const config = SOURCE_OBJECT_CONFIG[objectType];
  const idChunks = chunkArray(ids, ASSOCIATION_PAGE_LIMIT);

  for (const chunk of idChunks) {
    const payload = {
      properties: config.properties,
      inputs: chunk.map((id) => ({ id })),
    };

    const data = await fetchWithRefresh(`/crm/v3/objects/${objectType}/batch/read`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const results = Array.isArray(data?.results) ? data.results : [];
    results.forEach((item: any) => {
      const id = String(item?.id || '');
      if (!id) {
        return;
      }
      labelsById[id] = config.toLabel(item?.properties || {}, id);
    });
  }

  return labelsById;
}

function toCalendarEvents(results: any[], type: ActivityType, portalId?: string) {
  return results
    .map((item) => {
    const props = item.properties || {};
    const start = parseHubSpotDate(
      props.hs_timestamp || props.hs_meeting_start_time || props.createdate
    );
    const end = parseHubSpotDate(props.hs_meeting_end_time);

    const title =
      props.hs_meeting_title ||
      props.hs_call_title ||
      props.hs_task_subject ||
      props.subject ||
      props.summary ||
      type;

    const url = buildHubSpotActivityUrl(portalId, type, String(item.id), item.associations);
    let color;
    switch (type) {
      case 'meetings':
        color = 'blue';
        break;
      case 'calls':
        color = 'green';
        break;
      case 'tasks':
        color = 'gold';
        break;
      default:
        color = '';
    }

    if (!start) {
      return null;
    }

    const ownerId = props.hubspot_owner_id ? String(props.hubspot_owner_id) : undefined;

    return {
      id: `${type}-${item.id}`,
      title,
      start,
      end,
      url,
      color,
      extendedProps: {
        ...item,
        activityType: type,
        sourceId: item.id,
        ownerId,
      },
    };
  })
    .filter(Boolean);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type = 'all' } = req.query;
  const auth = getAuthContext(req);

  const initialToken = auth.accessToken || process.env.HUBSPOT_TOKEN;
  let token: string;
  let portal = auth.portalId || process.env.HUBSPOT_PORTAL_ID;

  if (!initialToken) {
    res.status(401).json({
      error: 'HubSpot account is not connected',
      authUrl: '/api/oauth/start',
    });
    return;
  }

  token = initialToken;

  try {
    const requestedType = type.toString();
    const types: ActivityType[] =
      requestedType === 'all'
        ? ['meetings', 'calls', 'tasks']
        : isActivityType(requestedType)
          ? [requestedType]
          : [];

    if (types.length === 0) {
      res.status(400).json({ error: 'Invalid activity type' });
      return;
    }

    const allEvents: any[] = [];
    const warnings: string[] = [];

    const fetchWithRefresh = async (path: string, init?: RequestInit) => {
      try {
        return await fetchObjects(path, token, init);
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
          return fetchObjects(path, token, init);
        }

        throw err;
      }
    };

    for (const t of types) {
      const config = OBJECT_CONFIG[t];
      let after: string | undefined;
      let page = 0;

      try {
        while (page < MAX_PAGES_PER_TYPE) {
          const params = new URLSearchParams({
            archived: 'false',
            limit: PAGE_LIMIT,
            properties: config.properties.join(','),
            associations: SOURCE_OBJECT_TYPES.join(','),
          });
          if (after) {
            params.set('after', after);
          }

          const path = `/crm/v3/objects/${t}?${params.toString()}`;
          const data = await fetchWithRefresh(path);

          if (data?.results) {
            allEvents.push(...toCalendarEvents(data.results, t, portal));
          }

          const nextAfter = data?.paging?.next?.after;
          if (!nextAfter) {
            break;
          }

          after = String(nextAfter);
          page += 1;
        }
      } catch (err) {
        if (err instanceof HubSpotApiError && err.status === 403) {
          const scopeHint = config.scopeHint ? ` (${config.scopeHint})` : '';
          warnings.push(`No permission for ${t}${scopeHint}`);
          continue;
        }

        throw err;
      }
    }

    if (!allEvents.length && warnings.length) {
      res.status(403).json({
        error: `Missing scopes for activities: ${warnings.join(', ')}`,
        authUrl: '/api/oauth/start',
      });
      return;
    }

    // Extract unique owner IDs
    const uniqueOwnerIds = new Set<string>();
    allEvents.forEach((event) => {
      if (event.extendedProps?.ownerId) {
        uniqueOwnerIds.add(event.extendedProps.ownerId);
      }
    });

    const ownerIds = Array.from(uniqueOwnerIds);
    let ownerLabelsByKey: Record<string, string> = {};
    let ownerReconnectRequired = false;

    try {
      const ownerLookup = await fetchOwnerLabels(fetchWithRefresh);
      ownerLabelsByKey = ownerLookup.labelsByAnyOwnerKey;
      ownerReconnectRequired = ownerLookup.missingScope;
    } catch {
      ownerLabelsByKey = {};
    }

    try {
      const userLookup = await fetchUserLabels(fetchWithRefresh);
      ownerLabelsByKey = {
        ...userLookup.labelsByAnyUserKey,
        ...ownerLabelsByKey,
      };
      ownerReconnectRequired = ownerReconnectRequired || userLookup.missingScope;
    } catch {
      // no-op
    }

    try {
      const crmUserLookup = await fetchCrmUserLabels(fetchWithRefresh);
      ownerLabelsByKey = {
        ...crmUserLookup.labelsByAnyUserKey,
        ...ownerLabelsByKey,
      };
      ownerReconnectRequired = ownerReconnectRequired || crmUserLookup.missingScope;
    } catch {
      // no-op
    }

    const ownerNameById: Record<string, string> = {};
    await Promise.all(
      ownerIds.map(async (id) => {
        const mapped = resolveOwnerLabel(id, ownerLabelsByKey);
        if (mapped) {
          ownerNameById[id] = mapped;
          return;
        }

        try {
          const fallbackById = await fetchOwnerLabelById(id, fetchWithRefresh);
          ownerNameById[id] = fallbackById || `Owner ${id}`;
        } catch (error) {
          if (error instanceof HubSpotApiError && error.status === 403) {
            ownerReconnectRequired = true;
          }

          ownerNameById[id] = `Owner ${id}`;
        }
      })
    );

    allEvents.forEach((event) => {
      const ownerId = event.extendedProps?.ownerId;
      if (ownerId) {
        event.extendedProps.ownerName = ownerNameById[ownerId] || `Owner ${ownerId}`;
      }
    });

    const sourceIdsByType: Record<SourceObjectType, Set<string>> = {
      companies: new Set<string>(),
      contacts: new Set<string>(),
      deals: new Set<string>(),
      tickets: new Set<string>(),
    };

    allEvents.forEach((event) => {
      const associations = event.extendedProps?.associations;
      SOURCE_OBJECT_TYPES.forEach((objectType) => {
        const ids = getAssociatedIds(associations, objectType);
        ids.forEach((id) => sourceIdsByType[objectType].add(id));
      });
    });

    const sourceLabelsByType: Record<SourceObjectType, Record<string, string>> = {
      companies: {},
      contacts: {},
      deals: {},
      tickets: {},
    };

    await Promise.all(
      SOURCE_OBJECT_TYPES.map(async (objectType) => {
        const ids = Array.from(sourceIdsByType[objectType]);
        if (!ids.length) {
          return;
        }

        try {
          sourceLabelsByType[objectType] = await fetchSourceLabels(
            objectType,
            ids,
            fetchWithRefresh
          );
        } catch {
          sourceLabelsByType[objectType] = {};
        }
      })
    );

    allEvents.forEach((event) => {
      const associations = event.extendedProps?.associations;
      let sourceLabel: string | undefined;

      for (const objectType of SOURCE_OBJECT_TYPES) {
        const ids = getAssociatedIds(associations, objectType);
        const firstId = ids[0];
        if (!firstId) {
          continue;
        }

        const label = sourceLabelsByType[objectType]?.[firstId];
        sourceLabel = label || sourceLabel;
        if (label) {
          break;
        }
      }

      if (sourceLabel) {
        event.extendedProps.sourceLabel = sourceLabel;
        if (typeof event.title === 'string' && !event.title.startsWith(`${sourceLabel} - `)) {
          event.title = `${sourceLabel} - ${event.title}`;
        }
      }
    });

    const owners: CalendarOwner[] = ownerIds.map((id) => ({
      id,
      label: ownerNameById[id] || `Owner ${id}`,
    }));

    const response: CalendarEventResponse = {
      events: allEvents,
      owners,
      ownerReconnectRequired,
      ownerReconnectUrl: ownerReconnectRequired ? '/api/oauth/start' : undefined,
      ownerWarning:
        ownerReconnectRequired && ownerIds.length > 0
          ? 'Pro načtení jmen ownerů přidejte do HubSpot app scopes oprávnění crm.objects.owners.read, settings.users.read nebo crm.objects.users.read a potom proveďte reconnect.'
          : undefined,
    };

    res.status(200).json(response);
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
