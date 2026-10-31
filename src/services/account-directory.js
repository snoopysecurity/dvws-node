const User = require('../models/user');

// A deliberately small RFC 4515-style filter evaluator over application users.
// Limits keep malformed training inputs from exhausting the process.
function parseFilter(input) {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Invalid directory filter');
  let index = 0;
  let nodes = 0;
  function parseOne(depth = 0) {
    if (depth > 32 || ++nodes > 128 || input[index++] !== '(') throw new Error('Invalid directory filter');
    const operator = input[index];
    if (operator === '&' || operator === '|') {
      index++;
      const children = [];
      while (input[index] === '(') children.push(parseOne(depth + 1));
      if (!children.length || input[index++] !== ')') throw new Error('Invalid directory filter');
      return { type: operator, children };
    }
    if (operator === '!') {
      index++;
      const child = parseOne(depth + 1);
      if (input[index++] !== ')') throw new Error('Invalid directory filter');
      return { type: '!', child };
    }
    const start = index;
    while (index < input.length && input[index] !== '=' && input[index] !== ')') index++;
    const attribute = input.slice(start, index).toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/.test(attribute) || input[index++] !== '=') throw new Error('Invalid directory filter');
    const byteParts = [[]];
    while (index < input.length && input[index] !== ')') {
      const character = input[index++];
      if (character === '(' || character === '\0') throw new Error('Invalid directory filter');
      if (character === '*') { byteParts.push([]); continue; }
      if (character === '\\') {
        const hex = input.slice(index, index + 2);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new Error('Invalid directory filter');
        byteParts[byteParts.length - 1].push(parseInt(hex, 16));
        index += 2;
      } else byteParts[byteParts.length - 1].push(...Buffer.from(character, 'utf8'));
    }
    if (input[index++] !== ')') throw new Error('Invalid directory filter');
    let parts;
    try { parts = byteParts.map((bytes) => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes))); }
    catch (_err) { throw new Error('Invalid directory filter'); }
    return { type: '=', attribute, parts, presence: parts.length === 2 && parts.every((part) => part === '') };
  }
  const filter = parseOne();
  if (index !== input.length) throw new Error('Invalid directory filter');
  return filter;
}

function directoryEntry(account) {
  const uid = String(account.username || '');
  // Stable lab-only POSIX-style IDs, derived without reading host account data.
  const uidNumber = 10000 + [...uid].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 50000, 0);
  return {
    uid,
    cn: uid,
    mail: account.email || '',
    description: account.admin ? 'Privileged application account' : 'Application account',
    uidNumber,
    gidNumber: account.admin ? 100 : 1000,
    homeDirectory: `/home/dvws/${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    objectClass: ['top', 'account', 'posixAccount']
  };
}

function matches(entry, filter) {
  if (filter.type === '&') return filter.children.every((child) => matches(entry, child));
  if (filter.type === '|') return filter.children.some((child) => matches(entry, child));
  if (filter.type === '!') return !matches(entry, filter.child);
  const actual = entry[filter.attribute === 'objectclass' ? 'objectClass' :
    Object.keys(entry).find((key) => key.toLowerCase() === filter.attribute)];
  if (actual === undefined || actual === null) return false;
  const values = Array.isArray(actual) ? actual : [actual];
  if (filter.presence) return values.some((value) => String(value).length > 0);
  const pattern = filter.parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  const expression = new RegExp(`^${pattern}$`, 'i');
  return values.some((value) => expression.test(String(value)));
}

async function search(filterString) {
  const filter = parseFilter(filterString);
  const accounts = await User.find({}).select('username email homeAddress admin').lean();
  return accounts.map((account) => ({ ...account, directory: directoryEntry(account) }))
    .filter((account) => matches(account.directory, filter));
}

module.exports = { search, parseFilter, matches };
