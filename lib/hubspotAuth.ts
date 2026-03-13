import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

const HUBSPOT_OAUTH_BASE = 'https://api.hubapi.com/oauth/v1';

const ACCESS_COOKIE = 'hubspot_access_token';
const REFRESH_COOKIE = 'hubspot_refresh_token';
const PORTAL_COOKIE = 'hubspot_portal_id';
const STATE_COOKIE = 'hubspot_oauth_state';

const DEFAULT_HUBSPOT_SCOPES = [
  'oauth',
  'crm.objects.contacts.read',
];

const DEFAULT_HUBSPOT_OPTIONAL_SCOPES: string[] = [
  // intentionally empty in safe mode to avoid scope mismatch with HubSpot app settings
];

type CookieOptions = {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
};

export type HubSpotOAuthSettings = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  optionalScopes: string[];
  postAuthRedirect: string;
};

export type HubSpotTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  hub_id?: number;
};

export type HubSpotAuthContext = {
  accessToken?: string;
  refreshToken?: string;
  portalId?: string;
  state?: string;
};

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
    const [rawKey, ...rest] = item.trim().split('=');
    if (!rawKey || rest.length === 0) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const path = options.path ?? '/';
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

function appendSetCookies(res: NextApiResponse, cookies: string[]) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookies);
    return;
  }

  const existingList = Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...existingList, ...cookies]);
}

function getRequestBaseUrl(req: NextApiRequest): string {
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;
  const protocol = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

export function getOAuthSettings(req: NextApiRequest): HubSpotOAuthSettings {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || getRequestBaseUrl(req);
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || `${baseUrl}/api/oauth/callback`;
  const useCustomScopes = process.env.HUBSPOT_USE_CUSTOM_SCOPES === 'true';
  const scopeSource =
    useCustomScopes && process.env.HUBSPOT_OAUTH_SCOPES
      ? process.env.HUBSPOT_OAUTH_SCOPES
      : DEFAULT_HUBSPOT_SCOPES.join(' ');
  const optionalScopeSource =
    useCustomScopes && process.env.HUBSPOT_OPTIONAL_SCOPES
      ? process.env.HUBSPOT_OPTIONAL_SCOPES
      : DEFAULT_HUBSPOT_OPTIONAL_SCOPES.join(' ');
  const normalizedScopeSource = scopeSource.trim().replace(/^['"]|['"]$/g, '');
  const normalizedOptionalScopeSource = optionalScopeSource.trim().replace(/^['"]|['"]$/g, '');
  const scopes = Array.from(
    new Set(
      normalizedScopeSource
        .split(/[\s,]+/)
        .map((scope) => scope.replace(/^['"]|['"]$/g, '').trim())
        .filter(Boolean)
    )
  );
  const optionalScopes = Array.from(
    new Set(
      normalizedOptionalScopeSource
        .split(/[\s,]+/)
        .map((scope) => scope.replace(/^['"]|['"]$/g, '').trim())
        .filter(Boolean)
    )
  );

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    optionalScopes,
    postAuthRedirect: process.env.HUBSPOT_POST_AUTH_REDIRECT || baseUrl,
  };
}

export function buildAuthorizeUrl(settings: HubSpotOAuthSettings, state: string): string {
  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', settings.clientId);
  authUrl.searchParams.set('redirect_uri', settings.redirectUri);
  authUrl.searchParams.set('scope', settings.scopes.join(' '));
  if (settings.optionalScopes.length > 0) {
    authUrl.searchParams.set('optional_scope', settings.optionalScopes.join(' '));
  }
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

export function generateOAuthState() {
  return randomBytes(24).toString('hex');
}

export function setOAuthStateCookie(res: NextApiResponse, state: string) {
  const secure = process.env.NODE_ENV === 'production';
  appendSetCookies(res, [
    serializeCookie(STATE_COOKIE, state, {
      maxAge: 10 * 60,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }),
  ]);
}

export function clearOAuthStateCookie(res: NextApiResponse) {
  const secure = process.env.NODE_ENV === 'production';
  appendSetCookies(res, [
    serializeCookie(STATE_COOKIE, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }),
  ]);
}

export function setAuthCookies(res: NextApiResponse, tokenData: HubSpotTokenResponse) {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = Number.isFinite(tokenData.expires_in) ? tokenData.expires_in : 1800;

  const cookies = [
    serializeCookie(ACCESS_COOKIE, tokenData.access_token, {
      maxAge,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }),
  ];

  if (tokenData.refresh_token) {
    cookies.push(
      serializeCookie(REFRESH_COOKIE, tokenData.refresh_token, {
        maxAge: 60 * 60 * 24 * 180,
        path: '/',
        httpOnly: true,
        secure,
        sameSite: 'Lax',
      })
    );
  }

  if (tokenData.hub_id) {
    cookies.push(
      serializeCookie(PORTAL_COOKIE, String(tokenData.hub_id), {
        maxAge: 60 * 60 * 24 * 180,
        path: '/',
        httpOnly: true,
        secure,
        sameSite: 'Lax',
      })
    );
  }

  appendSetCookies(res, cookies);
}

export function getAuthContext(req: NextApiRequest): HubSpotAuthContext {
  const parsed = parseCookieHeader(req.headers.cookie);
  return {
    accessToken: parsed[ACCESS_COOKIE],
    refreshToken: parsed[REFRESH_COOKIE],
    portalId: parsed[PORTAL_COOKIE],
    state: parsed[STATE_COOKIE],
  };
}

async function requestToken(body: URLSearchParams): Promise<HubSpotTokenResponse> {
  const response = await fetch(`${HUBSPOT_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorText = payload?.message || payload?.error || `HubSpot OAuth returned ${response.status}`;
    throw new Error(errorText);
  }

  return payload as HubSpotTokenResponse;
}

export async function exchangeCodeForTokens(
  code: string,
  settings: HubSpotOAuthSettings
): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    redirect_uri: settings.redirectUri,
    code,
  });

  return requestToken(body);
}

export async function refreshAccessToken(
  refreshToken: string,
  settings: HubSpotOAuthSettings
): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: refreshToken,
  });

  return requestToken(body);
}
