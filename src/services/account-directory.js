const User = require('../models/user');

// Small LDAP filter evaluator backed by the application's real account store.
// It accepts the filter string as assembled by the controller, so unescaped
// input can add wildcards and boolean clauses just as it would in a directory.
function parseFilter(input) {
  let index = 0;

  function parseOne() {
    if (input[index++] !== '(') throw new Error('Invalid directory filter');
    const operator = input[index];
    if (operator === '&' || operator === '|') {
      index++;
      const children = [];
      while (input[index] === '(') children.push(parseOne());
      if (!children.length || input[index++] !== ')') throw new Error('Invalid directory filter');
      return { type: operator, children };
    }
    if (operator === '!') {
      index++;
      const child = parseOne();
      if (input[index++] !== ')') throw new Error('Invalid directory filter');
      return { type: '!', child };
    }
    const end = input.indexOf(')', index);
    if (end < 0) throw new Error('Invalid directory filter');
    const assertion = input.slice(index, end);
    const equals = assertion.indexOf('=');
    if (equals < 1) throw new Error('Invalid directory filter');
    index = end + 1;
    return { type: '=', attribute: assertion.slice(0, equals).toLowerCase(), value: assertion.slice(equals + 1) };
  }

  // LDAP permits one root filter; concatenated roots from injection are
  // interpreted as an implicit conjunction by this deliberately permissive adapter.
  const roots = [];
  while (index < input.length) {
    // The controller's own closing parenthesis becomes an extra trailing
    // delimiter after a filter-closing injection payload.
    if (roots.length && input[index] === ')' && index === input.length - 1) {
      index++;
      break;
    }
    roots.push(parseOne());
  }
  if (!roots.length) throw new Error('Invalid directory filter');
  return roots.length === 1 ? roots[0] : { type: '&', children: roots };
}

function matches(account, filter) {
  if (filter.type === '&') return filter.children.every((child) => matches(account, child));
  if (filter.type === '|') return filter.children.some((child) => matches(account, child));
  if (filter.type === '!') return !matches(account, filter.child);
  const attributes = {
    uid: account.username,
    cn: account.username,
    mail: account.email,
    email: account.email,
    objectclass: 'account'
  };
  const actual = attributes[filter.attribute];
  if (actual === undefined || actual === null) return false;
  const pattern = filter.value.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${pattern}$`, 'i').test(String(actual));
}

async function search(filterString) {
  const filter = parseFilter(filterString);
  const accounts = await User.find({}).select('username email homeAddress admin').lean();
  return accounts.filter((account) => matches(account, filter));
}

module.exports = { search };
