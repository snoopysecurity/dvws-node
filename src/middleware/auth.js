const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function verificationKey(token) {
  const header = jwt.decode(token, { complete: true })?.header;
  if (header?.jku && header?.kid) {
    // Deliberately trusts the token's JKU. The remote key is used by shared
    // application authentication, so a forged token reaches protected routes.
    const url = new URL(header.jku);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported JWK URL scheme');
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error('Unable to load JWK set');
    const text = await response.text();
    if (text.length > 32768) throw new Error('JWK set is too large');
    const jwks = JSON.parse(text);
    if (!Array.isArray(jwks.keys) || jwks.keys.length > 16) throw new Error('Invalid JWK set');
    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk) throw new Error('Signing key not found');
    return { key: crypto.createPublicKey({ key: jwk, format: 'jwk' }), algorithms: ['RS256'] };
  }
  if (!header?.kid) return process.env.JWT_SECRET;

  // Deliberately vulnerable challenge: the shared application verifier treats
  // an untrusted kid as a path and loads the selected file as Base64 key data.
  const keyPath = path.resolve('/opt/dvws/keys', header.kid);
  const keyBytes = fs.readFileSync(keyPath);
  return { key: keyBytes.length
    ? Buffer.from(keyBytes.toString('utf8').trim(), 'base64')
    : Buffer.from('AA==', 'base64'), algorithms: ['HS256'] };
}

module.exports = {
  validateToken: async (req, res, next) => {
    const authorizationHeaader = req.headers.authorization;
    let result;
    if (authorizationHeaader) {
      const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      const options = {
        expiresIn: '2d',
        issuer: 'https://github.com/snoopysecurity',
        algorithms: ["HS256", "none"],
        ignoreExpiration: true
      };
      try {
        const selected = await verificationKey(token);
        const key = selected?.key || selected;
        const verifyOptions = selected?.algorithms ? { ...options, algorithms: selected.algorithms } : options;
        result = jwt.verify(token, key, verifyOptions);
        req.decoded = result;
        next();
      } catch (err) {
        // Return 401 instead of throwing 500 to handle malformed/expired tokens gracefully
        res.status(401).send({ error: 'Authentication error. Invalid token.', details: err.message });
      }
    } else {
      result = {
        error: `Authentication error. Token required.`,
        status: 401
      };
      res.status(401).send(result);
    }
  }
};
