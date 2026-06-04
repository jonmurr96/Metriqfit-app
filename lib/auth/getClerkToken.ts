/**
 * Returns a Clerk-signed JWT suitable for Edge Function Authorization headers.
 * Must be called after AuthProvider has initialized.
 */
let _tokenGetter: (() => Promise<string | null>) | null = null;

export function registerClerkTokenGetter(getter: () => Promise<string | null>) {
  _tokenGetter = getter;
}

export async function getClerkSupabaseToken(): Promise<string> {
  if (!_tokenGetter) {
    throw new Error('Clerk token getter not registered. Is AuthProvider mounted?');
  }
  const token = await _tokenGetter();
  if (!token) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return token;
}

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      throw new Error('Illegal base64url string!');
  }

  if (typeof atob === 'function') {
    return atob(output);
  }

  // Pure JavaScript fallback for environments without atob
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const buffer = output.replace(/=+$/, '');
  let decoded = '';
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < buffer.length; idx++) {
    const char = buffer.charAt(idx);
    const p = chars.indexOf(char);
    if (p === -1) continue;
    bs = bc % 4 ? bs * 64 + p : p;
    if (bc++ % 4) {
      decoded += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return decoded;
}

export async function getClerkUserId(): Promise<string> {
  const token = await getClerkSupabaseToken();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1];
  try {
    const decoded = base64UrlDecode(payload);
    const parsed = JSON.parse(decoded);
    if (!parsed.sub) {
      throw new Error('JWT does not contain user ID');
    }
    return parsed.sub;
  } catch (error) {
    throw new Error('Failed to parse user ID from token');
  }
}
