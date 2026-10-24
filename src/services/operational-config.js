const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

const document = new DOMParser().parseFromString(
  fs.readFileSync(path.join(__dirname, '../../config/operations.xml'), 'utf8'),
  'application/xml'
);

function directChildText(parent, name) {
  const child = Array.from(parent.childNodes).find((node) => node.nodeType === 1 && node.nodeName === name);
  return child?.textContent?.trim() || null;
}

function findActivePromotion(code) {
  const store = document.getElementsByTagName('resourceStore')[0];
  if (!store || typeof code !== 'string') return null;
  for (const promotion of Array.from(store.getElementsByTagName('promotion'))) {
    const configuredCode = directChildText(promotion, 'code');
    const credits = Number(directChildText(promotion, 'credits'));
    if (configuredCode === code && directChildText(promotion, 'active') === 'true' &&
        Number.isSafeInteger(credits) && credits > 0) {
      return { code: configuredCode, credits };
    }
  }
  return null;
}

module.exports = { document, findActivePromotion };
