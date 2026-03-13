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

    // Validate state when either the URL contains state or the session has a
    // state cookie – this preserves CSRF protection for the normal /oauth/start
    // flow while allowing direct installs via the HubSpot-provided install URL
    // (which never sends a state parameter).
    const stateRequired = !!incomingState || !!cookieState;
    if (stateRequired && (!cookieState || cookieState !== incomingState)) {
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
