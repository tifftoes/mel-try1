require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const IN_PROD = process.env.NODE_ENV === 'production';

if (!process.env.PATREON_CLIENT_ID || !process.env.PATREON_CLIENT_SECRET || !process.env.PATREON_REDIRECT_URI) {
  console.warn('Warning: PATREON_CLIENT_ID, PATREON_CLIENT_SECRET and PATREON_REDIRECT_URI should be set in environment.');
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: IN_PROD, httpOnly: true, sameSite: 'lax' }
}));

// Serve the static frontend from the repo root so testing is just one server
const webRoot = path.join(__dirname, '..');
app.use(express.static(webRoot));

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const SCOPES = 'identity identity.memberships';

function makeState() {
  return crypto.randomBytes(16).toString('hex');
}

// Start OAuth flow
app.get('/auth/patreon', (req, res) => {
  const state = makeState();
  req.session.oauthState = state;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state
  });
  const url = `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
  res.redirect(url);
});

// OAuth callback
app.get('/auth/patreon/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');
  if (!state || state !== req.session.oauthState) return res.status(400).send('Invalid state');

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);

    const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const tokenJson = await tokenRes.json();

    if (!tokenJson.access_token) {
      console.error('Token exchange error', tokenJson);
      return res.status(500).json({ error: 'Token exchange failed', details: tokenJson });
    }

    // store tokens in session (for dev). In production persist encrypted.
    req.session.tokens = tokenJson;

    // fetch identity with memberships
    const identityRes = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    });
    const identityJson = await identityRes.json();

    // determine patron status from included membership resources
    let isPatron = false;
    if (Array.isArray(identityJson.included)) {
      for (const inc of identityJson.included) {
        const type = inc.type || '';
        const attrs = inc.attributes || {};
        if (type === 'member' || type === 'membership') {
          if (attrs.patron_status === 'active_patron') {
            isPatron = true;
            break;
          }
          if (Array.isArray(attrs.currently_entitled_tiers) && attrs.currently_entitled_tiers.length > 0) {
            isPatron = true;
            break;
          }
        }
      }
    }

    req.session.user = {
      id: identityJson.data && identityJson.data.id,
      attributes: identityJson.data && identityJson.data.attributes,
      is_patron: isPatron,
      raw: identityJson
    };

    // redirect back to frontend (if provided) or root
    const dest = FRONTEND_URL || '/';
    res.redirect(dest);
  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth callback failed');
  }
});

// Refresh endpoint
app.post('/auth/patreon/refresh', express.json(), async (req, res) => {
  const refreshToken = req.session.tokens && req.session.tokens.refresh_token;
  if (!refreshToken) return res.status(400).json({ error: 'no refresh token' });

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const tokenJson = await tokenRes.json();
    req.session.tokens = tokenJson;
    res.json(tokenJson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'refresh failed' });
  }
});

// API for frontend to check current user
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`Patreon OAuth API listening on http://localhost:${PORT}`));
