import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "os_session";
const SESSION_DURATION = "7d";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a long random value in .env " +
        "(see .env.example) before starting the server.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string; // user id
  role: Role;
  tenantId: string | null;
  email: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Signs the session JWT and sets it as an httpOnly cookie. Server Action / Route Handler only. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Server Action / Route Handler only. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Pure token verification with no dependency on next/headers, so it also
 * works from middleware.ts (which reads the cookie off NextRequest instead —
 * the next/headers cookies() API isn't available in that context).
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

/** Safe to call from Server Components, Server Actions, and Route Handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export class AuthError extends Error {}

/** Throws AuthError if there's no session, or the session's role isn't allowed. */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new AuthError("Not authorized");
  }
  return session;
}

/** Owner/staff session with a guaranteed tenantId. */
export async function requireTenantSession(): Promise<SessionPayload & { tenantId: string }> {
  const session = await requireRole("OWNER", "STAFF");
  if (!session.tenantId) {
    throw new AuthError("Session has no tenant");
  }
  return session as SessionPayload & { tenantId: string };
}

/**
 * Owner-only session with a guaranteed tenantId — for pages/actions staff
 * must not reach: branding, coupons, tables, analytics, and staff
 * management itself (see CLAUDE.md's staff-roles note for the reasoning).
 * The dashboard nav also hides these links from staff so this should only
 * ever trigger on a deliberate direct URL visit.
 */
export async function requireOwnerSession(): Promise<SessionPayload & { tenantId: string }> {
  const session = await requireRole("OWNER");
  if (!session.tenantId) {
    throw new AuthError("Session has no tenant");
  }
  return session as SessionPayload & { tenantId: string };
}
