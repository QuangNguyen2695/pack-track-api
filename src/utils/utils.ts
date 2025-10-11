import { Types } from 'mongoose';

export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export function generateNumberAlphabet(): string {
  return this.nanoid();
}

const _Buffer = typeof Buffer !== 'undefined' ? Buffer : (undefined as any);

// --- Buffer helpers ---
function isNodeBuffer(x: any): boolean {
  return !!_Buffer && _Buffer.isBuffer?.(x);
}
function isUint8(x: any): boolean {
  return x instanceof Uint8Array;
}
function isJsonBufferShape(x: any): boolean {
  return x && typeof x === 'object' && x.type === 'Buffer' && Array.isArray(x.data);
}
function fromJsonBuffer(x: any): any {
  try {
    return _Buffer.from(x.data);
  } catch {
    return null;
  }
}

export function bufferToObjectIdHex(bufLike: any): string | null {
  try {
    const b: any = isNodeBuffer(bufLike)
      ? bufLike
      : isUint8(bufLike)
        ? _Buffer.from(bufLike)
        : isJsonBufferShape(bufLike)
          ? fromJsonBuffer(bufLike)
          : null;

    if (!b) return null;

    // ObjectId raw bytes = 12 bytes → hex 24 chars
    if (b.length === 12) return b.toString('hex');

    // Một số lib có thể đưa về chuỗi hex dưới dạng bytes ascii (24)
    const asText = b.toString('utf8');
    if (/^[0-9a-f]{24}$/i.test(asText)) return asText;

    // Fallback: dùng hex (dù không chắc là ObjectId, vẫn convert nhất quán)
    return b.toString('hex');
  } catch {
    return null;
  }
}

export function idToString(x: any): string | null {
  if (x == null) return null;

  // Mongoose/BSON ObjectId
  if (x instanceof Types.ObjectId) return x.toHexString();
  if (x?._bsontype === 'ObjectID' && typeof x.toHexString === 'function') return x.toHexString();

  // Buffer-like → hex
  const fromBuf = bufferToObjectIdHex(x);
  if (fromBuf) return fromBuf;

  // string
  if (typeof x === 'string') return x;

  // populated object { _id: ... }
  if (typeof x === 'object' && x._id != null) return idToString(x._id);

  return null;
}

export function eqObjectId(a: any, b: any): boolean {
  const as = idToString(a);
  const bs = idToString(b);
  return !!as && !!bs && as.toLowerCase() === bs.toLowerCase();
}
