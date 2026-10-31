const fs = require('fs');
const { fileURLToPath } = require('url');
const { DOMParser } = require('@xmldom/xmldom');

// Deliberately resolves entities from untrusted XML for the XXE exercises.
// This handles general entities in the internal DTD subset, including file: URLs.
function parseVulnerableXml(xml) {
  const declarations = new Map();
  const doctypeStart = xml.search(/<!DOCTYPE\b/i);
  let documentXml = xml;

  if (doctypeStart !== -1) {
    let quote = null;
    let subsetDepth = 0;
    let doctypeEnd = -1;

    for (let index = doctypeStart + 9; index < xml.length; index++) {
      const character = xml[index];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '[') {
        subsetDepth++;
      } else if (character === ']') {
        subsetDepth--;
      } else if (character === '>' && subsetDepth === 0) {
        doctypeEnd = index + 1;
        break;
      }
    }

    if (doctypeEnd === -1) throw new Error('Invalid XML DOCTYPE');

    const doctype = xml.slice(doctypeStart, doctypeEnd);
    const entityDeclaration = /<!ENTITY\s+([A-Za-z_][\w.:-]*)\s+(SYSTEM\s+)?(["'])([\s\S]*?)\3\s*>/g;
    let match;
    while ((match = entityDeclaration.exec(doctype)) !== null) {
      declarations.set(match[1], {
        external: Boolean(match[2]),
        value: match[4]
      });
    }

    documentXml = xml.slice(0, doctypeStart) + xml.slice(doctypeEnd);
  }

  const escapeXml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  function expand(value, resolving = new Set()) {
    return value.replace(/&([A-Za-z_][\w.:-]*);/g, (reference, name) => {
      const declaration = declarations.get(name);
      if (!declaration) return reference;
      if (resolving.has(name)) throw new Error(`Recursive XML entity: ${name}`);

      if (declaration.external) {
        const url = new URL(declaration.value);
        if (url.protocol !== 'file:') throw new Error(`Unsupported XML entity URL: ${url.protocol}`);
        return escapeXml(fs.readFileSync(fileURLToPath(url), 'utf8'));
      }

      resolving.add(name);
      try {
        return expand(declaration.value, resolving);
      } finally {
        resolving.delete(name);
      }
    });
  }

  const document = new DOMParser({
    onError: (level, message) => {
      if (level === 'warning') return;
      throw new Error(message);
    }
  }).parseFromString(expand(documentXml), 'application/xml');

  if (!document.documentElement) throw new Error('XML root element missing');
  return document;
}

module.exports = { parseVulnerableXml };
