/**
 * MD5 (RFC 1321). Web Crypto does not offer MD5, so it is implemented here.
 * Incremental: call update() any number of times, then digest() once.
 * MD5 is broken for security use; it is here for checksums and legacy systems.
 */

// Per-round shift amounts.
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

// K[i] = floor(|sin(i + 1)| * 2^32).
const K = Uint32Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

export class Md5 {
  private state = Uint32Array.of(0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476);
  private buffer = new Uint8Array(64);
  private buffered = 0;
  private length = 0; // bytes processed, for the final length field
  private words = new Uint32Array(16);
  private done = false;

  update(data: Uint8Array): this {
    if (this.done) throw new Error("MD5 digest already taken.");
    this.length += data.length;
    let offset = 0;
    if (this.buffered > 0) {
      const take = Math.min(64 - this.buffered, data.length);
      this.buffer.set(data.subarray(0, take), this.buffered);
      this.buffered += take;
      offset = take;
      if (this.buffered < 64) return this;
      this.block(this.buffer, 0);
      this.buffered = 0;
    }
    for (; offset + 64 <= data.length; offset += 64) this.block(data, offset);
    if (offset < data.length) {
      this.buffer.set(data.subarray(offset), 0);
      this.buffered = data.length - offset;
    }
    return this;
  }

  digest(): Uint8Array {
    if (this.done) throw new Error("MD5 digest already taken.");
    const bitLength = this.length * 8;
    // Pad with 0x80, zeros to 56 mod 64, then the 64-bit little-endian bit length.
    const padLength = this.buffered < 56 ? 56 - this.buffered : 120 - this.buffered;
    const tail = new Uint8Array(padLength + 8);
    tail[0] = 0x80;
    const view = new DataView(tail.buffer);
    view.setUint32(padLength, bitLength >>> 0, true);
    view.setUint32(padLength + 4, Math.floor(bitLength / 2 ** 32), true);
    this.update(tail);
    this.done = true;
    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    this.state.forEach((word, i) => outView.setUint32(i * 4, word, true));
    return out;
  }

  private block(data: Uint8Array, offset: number) {
    const x = this.words;
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      x[i] = data[j] | (data[j + 1] << 8) | (data[j + 2] << 16) | (data[j + 3] << 24);
    }
    let [a, b, c, d] = this.state;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const sum = (a + f + K[i] + x[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((sum << S[i]) | (sum >>> (32 - S[i])))) | 0;
    }
    this.state[0] += a;
    this.state[1] += b;
    this.state[2] += c;
    this.state[3] += d;
  }
}

export const md5 = (data: Uint8Array) => new Md5().update(data).digest();

/** HMAC-MD5 (RFC 2104), streaming the message once. */
export const hmacMd5 = (key: Uint8Array, data: Uint8Array) => {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? md5(key) : key);
  const inner = new Md5().update(block.map((byte) => byte ^ 0x36)).update(data).digest();
  return new Md5().update(block.map((byte) => byte ^ 0x5c)).update(inner).digest();
};
