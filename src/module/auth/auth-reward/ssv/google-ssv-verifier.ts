import * as crypto from 'crypto';

const KEY_SERVER_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const DEFAULT_TTL_MS = 23 * 60 * 60 * 1000; // < 24h

export class GoogleSsvVerifier {
  private cache?: { keys: Record<string, string>; fetchedAt: number };
  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  async verifyFromFullUrl(callbackUrl: string): Promise<boolean> {
    const url = new URL(callbackUrl);
    const qs = url.search.substring(1);
    if (!qs) return false;

    const { dataToVerify, signatureB64Url, keyId } = this.extractSigAndKey(qs);
    if (!signatureB64Url || !keyId) return false;

    const signature = base64UrlToBuffer(signatureB64Url);
    const keys = await this.getPublicKeys();
    const pem = keys[keyId];
    if (!pem) return false;

    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(dataToVerify, 'utf8'));
    verifier.end();
    return verifier.verify(pem, signature);
  }

  parseParams(callbackUrl: string): Record<string, string> {
    const url = new URL(callbackUrl);
    const out: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (out[k] = v));
    if (!out['transaction_id'] && url.searchParams.get('ad_event_id')) {
      out['transaction_id'] = url.searchParams.get('ad_event_id') as string;
    }
    return out;
  }

  private async getPublicKeys() {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < this.ttlMs) return this.cache.keys;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(KEY_SERVER_URL, { signal: ac.signal } as any);
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Failed to fetch AdMob keys: ${res.status}`);
    const data: any = await res.json();
    const arr = Array.isArray(data?.keys) ? data.keys : [];
    const map: Record<string, string> = {};
    for (const k of arr) {
      const id = String(k.keyId ?? k.key_id ?? '');
      const pem = String(k.pem ?? '');
      if (id && pem) map[id] = pem;
    }
    this.cache = { keys: map, fetchedAt: now };
    return map;
  }

  private extractSigAndKey(queryString: string): {
    dataToVerify: string;
    signatureB64Url: string | null;
    keyId: string | null;
  } {
    const sigPos = queryString.indexOf('signature=');
    if (sigPos === -1) return { dataToVerify: '', signatureB64Url: null, keyId: null };

    const pre = queryString.substring(0, sigPos - 1); // data before '&signature='
    const tail = queryString.substring(sigPos);

    const keyIdx = tail.indexOf('key_id=');
    if (keyIdx === -1) return { dataToVerify: pre, signatureB64Url: null, keyId: null };

    const signatureB64Url = tail.substring('signature='.length, keyIdx - 1);
    const keyId = tail.substring(keyIdx + 'key_id='.length);
    return { dataToVerify: pre, signatureB64Url, keyId };
  }
}

function base64UrlToBuffer(s: string): Buffer {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  else if (pad !== 0) throw new Error('Invalid base64url');
  return Buffer.from(b64, 'base64');
}
