const crypto = require('crypto');

// Generate UUIDv1 values using the Gregorian timestamp, a process-local
// monotonic counter, and a random node/clock sequence.
const node = crypto.randomBytes(6);
node[0] |= 0x01; // mark the node as randomly generated
const clockSeq = crypto.randomBytes(2).readUInt16BE(0) & 0x3fff;
const UUID_EPOCH_OFFSET = 0x01b21dd213814000n;
let lastTimestamp = 0n;

module.exports = function uuidV1() {
  let timestamp = BigInt(Date.now()) * 10000n + UUID_EPOCH_OFFSET;
  if (timestamp <= lastTimestamp) timestamp = lastTimestamp + 1n;
  lastTimestamp = timestamp;

  const timeLow = Number(timestamp & 0xffffffffn).toString(16).padStart(8, '0');
  const timeMid = Number((timestamp >> 32n) & 0xffffn).toString(16).padStart(4, '0');
  const timeHigh = (Number((timestamp >> 48n) & 0x0fffn) | 0x1000).toString(16).padStart(4, '0');
  const sequence = (clockSeq | 0x8000).toString(16).padStart(4, '0');
  const nodeHex = node.toString('hex');
  return `${timeLow}-${timeMid}-${timeHigh}-${sequence}-${nodeHex}`;
};
