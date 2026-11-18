// Password hashing shared by the API (login) and the teacher's `turmas` script, which
// hashes before sending so creating a class costs the server no CPU (decision 0016).
// WebCrypto only: runs in Cloudflare Workers and in Node 18+.

export const PBKDF2_ITERATIONS = 10000;   // Workers' free plan has ~10 ms CPU per request

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS }, key, 256);
}

/** { salt, hash } (base64) for a new password. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: b64(await derive(password, salt)) };
}

/** True if `password` matches the stored salt and hash. */
export async function checkPassword(password, salt, hash) {
  const got = new Uint8Array(await derive(password, unb64(salt)));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
