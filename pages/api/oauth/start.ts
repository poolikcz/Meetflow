import type { NextApiRequest, NextApiResponse } from 'next';
import { buildAuthorizeUrl, generateOAuthState, getOAuthSettings, setOAuthStateCookie } from '../../../lib/hubspotAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const settings = getOAuthSettings(req);
    const state = generateOAuthState();
    setOAuthStateCookie(res, state);
    const authorizeUrl = buildAuthorizeUrl(settings, state);
    res.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start HubSpot OAuth';
    res.status(500).json({ error: message });
  }
}
