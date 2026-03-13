import type { NextApiRequest, NextApiResponse } from 'next';
import {
  clearOAuthStateCookie,
  exchangeCodeForTokens,
  getAuthContext,
  getOAuthSettings,
  setAuthCookies,
} from '../../../lib/hubspotAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query;

  if (error) {
    const errorMessage = Array.isArray(error) ? error[0] : error;
    res.status(400).json({ error: `HubSpot OAuth error: ${errorMessage}` });
    return;
  }

  const authCode = Array.isArray(code) ? code[0] : code;
  const incomingState = Array.isArray(state) ? state[0] : state;

  if (!authCode) {
    res.status(400).json({ error: 'Missing OAuth code' });
    return;
  }

  try {
    const settings = getOAuthSettings(req);
    const cookieState = getAuthContext(req).state;

    // Only validate state when our own /oauth/start flow set a state cookie.
    // This preserves CSRF protection for the normal flow while allowing direct
    // installs via shareable HubSpot install URLs (no cookie → no state check).
    if (cookieState && cookieState !== incomingState) {
      res.status(400).json({ error: 'Invalid OAuth state' });
      return;
    }

    const tokenData = await exchangeCodeForTokens(authCode, settings);
    setAuthCookies(res, tokenData);
    clearOAuthStateCookie(res);
    res.redirect(settings.postAuthRedirect);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed';
    res.status(500).json({ error: message });
  }
}
