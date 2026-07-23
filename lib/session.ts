import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "CUSTOMER";
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definida");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(
  session: string | undefined = "",
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}
