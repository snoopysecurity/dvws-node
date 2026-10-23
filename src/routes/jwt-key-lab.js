const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

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

module.exports = (router) => {
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
