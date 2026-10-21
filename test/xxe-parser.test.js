const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { parseVulnerableXml } = require('../src/utils/vulnerable-xml');

describe('XXE exercise parser', function () {
  it('reads an external file entity and makes its content available to both XML consumers', function () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvws-xxe-'));
    const filename = path.join(directory, 'proof.txt');
    fs.writeFileSync(filename, 'XXE proof <&>');

    try {
      const entity = `<!ENTITY xxe SYSTEM "${pathToFileURL(filename).href}">`;
      const soap = parseVulnerableXml(`<?xml version="1.0"?>
        <!DOCTYPE foo [${entity}]>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body><username>&xxe;</username></soapenv:Body>
        </soapenv:Envelope>`);
      const notes = parseVulnerableXml(`<!DOCTYPE notes [${entity}]>
        <notes><note><name>&xxe;</name></note></notes>`);

      assert.strictEqual(soap.getElementsByTagName('username')[0].textContent, 'XXE proof <&>');
      assert.strictEqual(notes.getElementsByTagName('name')[0].textContent, 'XXE proof <&>');
    } finally {
      fs.unlinkSync(filename);
      fs.rmdirSync(directory);
    }
  });

  it('expands nested internal entities used by the XML bomb exercise', function () {
    const xml = '<!DOCTYPE root [<!ENTITY a "repeat"><!ENTITY b "&a;&a;">]><root>&b;</root>';
    assert.strictEqual(parseVulnerableXml(xml).documentElement.textContent, 'repeatrepeat');
  });
});
