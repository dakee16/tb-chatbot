#!/usr/bin/env node
// scripts/oauth-bootstrap.js
//
// One-time helper: walks through Magento 1's 3-legged OAuth 1.0a dance
// and prints the access token + secret to paste into .env.local.
//
// USAGE:
//   1. Make sure .env.local has MAGENTO_BASE_URL, MAGENTO_CONSUMER_KEY, MAGENTO_CONSUMER_SECRET
//   2. In Magento admin, update your OAuth Consumer's Callback URL to:
//        http://localhost:3030/callback
//   3. Run: node scripts/oauth-bootstrap.js
//   4. A browser-open URL prints — open it, log in as admin, approve the app
//   5. Script catches the callback, prints MAGENTO_ACCESS_TOKEN + MAGENTO_ACCESS_TOKEN_SECRET
//   6. Paste those into .env.local. Done forever.
//
// You can change the callback URL by setting CALLBACK_PORT env var.

import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

// ---- Load .env.local manually (no dotenv dep needed) ----
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found in', process.cwd());
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const BASE = process.env.MAGENTO_BASE_URL;
const CONSUMER_KEY = process.env.MAGENTO_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MAGENTO_CONSUMER_SECRET;
const CALLBACK_PORT = parseInt(process.env.CALLBACK_PORT || '3030', 10);
const CALLBACK_URL = `http://127.0.0.1:${CALLBACK_PORT}/callback`;

if (!BASE || !CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('ERROR: MAGENTO_BASE_URL, MAGENTO_CONSUMER_KEY, and MAGENTO_CONSUMER_SECRET must be set in .env.local');
  process.exit(1);
}

const oauth = new OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

// ---- Helpers ----

function parseOAuthResponse(body) {
  // Magento returns oauth params as form-urlencoded: oauth_token=xxx&oauth_token_secret=yyy
  const out = {};
  for (const pair of body.split('&')) {
    const [k, v] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

async function signedFetch(url, method = 'POST', token = null, extraParams = {}) {
  const requestData = { url, method, data: extraParams };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const body = new URLSearchParams(extraParams).toString();

  const res = await fetch(url, {
    method,
    headers: {
      ...authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    },
    body: method === 'POST' ? body : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return text;
}

// ---- Step 1: Get request token ----
async function getRequestToken() {
  console.log('\n[1/3] Requesting unauthorized request token...');
  const url = `${BASE}/oauth/initiate`;
  const text = await signedFetch(url, 'POST', null, { oauth_callback: CALLBACK_URL });
  const parsed = parseOAuthResponse(text);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error(`Unexpected response: ${text}`);
  }
  console.log('    ✓ got request token');
  return { key: parsed.oauth_token, secret: parsed.oauth_token_secret };
}

// ---- Step 2: User authorizes in browser, we catch callback ----
function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      if (parsed.pathname !== '/callback') {
        res.writeHead(404).end('Not found');
        return;
      }
      const oauth_token = parsed.searchParams.get('oauth_token');
      const oauth_verifier = parsed.searchParams.get('oauth_verifier');

      if (!oauth_token || !oauth_verifier) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing oauth_token or oauth_verifier in callback</h1>');
        reject(new Error('Missing oauth_token or oauth_verifier in callback'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>✓ Authorized</h1>
          <p>You can close this tab. Check your terminal for the access tokens.</p>
        </body></html>
      `);
      server.close();
      resolve({ oauth_token, oauth_verifier });
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      console.log(`    listening on ${CALLBACK_URL} for the Magento redirect...`);
    });
  });
}

// ---- Step 3: Exchange for access token ----
async function getAccessToken(requestToken, verifier) {
  console.log('\n[3/3] Exchanging request token + verifier for access token...');
  const url = `${BASE}/oauth/token`;
  const text = await signedFetch(url, 'POST', requestToken, { oauth_verifier: verifier });
  const parsed = parseOAuthResponse(text);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error(`Unexpected response: ${text}`);
  }
  console.log('    ✓ got access token');
  return { key: parsed.oauth_token, secret: parsed.oauth_token_secret };
}

// ---- Main ----
(async () => {
  try {
    const requestToken = await getRequestToken();

    const adminPath = process.env.MAGENTO_ADMIN_PATH || 'admin';
    const authorizeUrl = `${BASE}/${adminPath}/oauth_authorize?oauth_token=${requestToken.key}`;
    console.log('\n[2/3] Open this URL in your browser and log in as an admin:');
    console.log('\n    ' + authorizeUrl + '\n');
    console.log('    (if you get a 404, try: ' + BASE + '/index.php/' + adminPath + '/oauth_authorize?oauth_token=' + requestToken.key + ')');
    const { oauth_token: returnedToken, oauth_verifier } = await waitForCallback();

    if (returnedToken !== requestToken.key) {
      throw new Error('Returned oauth_token does not match the request token');
    }

    const accessToken = await getAccessToken(requestToken, oauth_verifier);

    console.log('\n========================================');
    console.log('SUCCESS — paste these into .env.local:');
    console.log('========================================');
    console.log(`MAGENTO_ACCESS_TOKEN=${accessToken.key}`);
    console.log(`MAGENTO_ACCESS_TOKEN_SECRET=${accessToken.secret}`);
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\nERROR:', err.message);
    process.exit(1);
  }
})();
