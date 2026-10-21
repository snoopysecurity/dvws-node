/** @param {string} value */
function toBase15(value) {
  return Array.from(value, (character) => character.charCodeAt(0).toString(15)).join('');
}

const pattern = /[a-zA-Z0-9_\-+\.]/;

function randomByte() {
  if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint8Array(1))[0];
  return Math.floor(Math.random() * 256);
}

export const PassGen = {
  /** @param {number} length */
  generate(length) {
    return Array.from({ length }, () => {
      while (true) {
        const character = String.fromCharCode(randomByte());
        if (pattern.test(character)) return toBase15(character);
      }
    }).join('');
  }
};
