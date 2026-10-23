const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const labProfiles = {
  'customer@dvws.local': { email: 'customer@dvws.local', name: 'Training Customer', plan: 'standard' },
  'admin@dvws.local': { email: 'admin@dvws.local', name: 'Training Administrator', plan: 'admin' }
};

function readBearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function getHeader(token) {
  try {
    return jwt.decode(token, { complete: true })?.header;
  } catch (err) {
    return null;
  }
}

async function fetchJwkSet(urlValue) {
  const url = new URL(urlValue);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported JWK URL scheme');
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error('Unable to load JWK set');
  const text = await response.text();
  if (text.length > 32768) throw new Error('JWK set is too large');
  const jwks = JSON.parse(text);
  if (!Array.isArray(jwks.keys) || jwks.keys.length > 16) throw new Error('Invalid JWK set');
  return jwks.keys;
}

function sendProfile(res, payload) {
  const profile = labProfiles[payload.sub];
  if (!profile) return res.status(404).json({ error: 'Synthetic lab profile not found' });
  return res.json({ profile, authenticatedAs: payload.sub });
}

module.exports = (router) => {
  // Intentionally trusts the token's jku header. Kept isolated from shared auth.
  router.get('/v2/jwt-key-lab/jku/profile', async (req, res) => {
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'Bearer token required' });
    const header = getHeader(token);
    if (!header?.jku || !header?.kid) return res.status(401).json({ error: 'JWT jku and kid headers required' });
    try {
      const keys = await fetchJwkSet(header.jku);
      const jwk = keys.find((key) => key.kid === header.kid);
      if (!jwk) return res.status(401).json({ error: 'Signing key not found' });
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      return sendProfile(res, payload);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid JKU lab token' });
    }
  });

  // Intentionally treats kid as a path. Reads only key bytes and never returns file contents.
  router.get('/v2/jwt-key-lab/kid/profile', (req, res) => {
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'Bearer token required' });
    const header = getHeader(token);
    if (!header?.kid) return res.status(401).json({ error: 'JWT kid header required' });
    try {
      const keyPath = path.resolve('/opt/dvws/keys', header.kid);
      const keyBytes = fs.readFileSync(keyPath);
      // This lab's legacy key loader decodes key files as Base64; /dev/null
      // therefore yields the empty Base64 value, represented by the single NUL byte.
      const secret = keyBytes.length ? Buffer.from(keyBytes.toString('utf8').trim(), 'base64') : Buffer.from('AA==', 'base64');
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return sendProfile(res, payload);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid KID lab token' });
    }
  });

  return router;
};
