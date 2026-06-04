/**
 * Clerk JWT verification for Supabase edge functions.
 *
 * The client authenticates with Clerk and forwards the Clerk session JWT (RS256).
 * Supabase's GoTrue (`supabase.auth.getUser()`) only validates the project's HS256
 * tokens and rejects Clerk's RS256, so we verify the Clerk token directly against
 * the issuer's JWKS.
 *
 * The expected issuer is PINNED (never derived from the token) so a token signed by
 * a different issuer cannot be passed off as valid by changing its `iss` claim.
 *
 * Override the issuer per-environment with the `CLERK_JWT_ISSUER` secret.
 */
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "https://esm.sh/jose@5.9.6";

export const CLERK_JWT_ISSUER =
  (Deno as any).env.get("CLERK_JWT_ISSUER") || "https://comic-bluejay-25.clerk.accounts.dev";

const _jwks = createRemoteJWKSet(
  new URL(`${CLERK_JWT_ISSUER.replace(/\/$/, "")}/.well-known/jwks.json`),
);

export interface ClerkUser {
  id: string;
  email?: string;
}

export class ClerkAuthError extends Error {}

/** Verify a raw Clerk JWT and return the user. Throws ClerkAuthError on failure. */
export async function verifyClerkUser(token: string): Promise<ClerkUser> {
  if (!token) throw new ClerkAuthError("Authorization token is required");
  let unverified: any;
  try {
    unverified = decodeJwt(token);
  } catch {
    throw new ClerkAuthError("Malformed authentication token");
  }
  if (unverified.iss !== CLERK_JWT_ISSUER) {
    throw new ClerkAuthError("Token issuer is not trusted");
  }
  let payload: any;
  try {
    ({ payload } = await jwtVerify(token, _jwks, { issuer: CLERK_JWT_ISSUER }));
  } catch (e: any) {
    throw new ClerkAuthError(e?.message || "Invalid or expired authentication token");
  }
  if (!payload.sub) throw new ClerkAuthError("Token is missing a subject (sub) claim");
  return { id: String(payload.sub), email: payload.email ? String(payload.email) : undefined };
}

/**
 * Convenience for the common pattern:
 *   const { data: authData, error: authError } = await supabase.auth.getUser();
 * becomes:
 *   const { data: authData, error: authError } = await verifyClerkRequest(req);
 *
 * Returns the same shape (`{ data: { user }, error }`) so existing downstream code
 * that reads `authData.user.id` / `authData.user.email` keeps working unchanged.
 */
export async function verifyClerkRequest(
  req: Request,
): Promise<
  | { data: { user: ClerkUser }; error: null }
  | { data: { user: null }; error: { message: string; status: number } }
> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = (authHeader.split(" ")[1] ?? "").trim();
  try {
    const user = await verifyClerkUser(token);
    return { data: { user }, error: null };
  } catch (e: any) {
    return { data: { user: null }, error: { message: e?.message || "Unauthorized", status: 401 } };
  }
}
