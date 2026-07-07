import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { isStaffRole } from "@/lib/rbac";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key";
const key = new TextEncoder().encode(secretKey);

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    expires,
    sameSite: "lax" as const,
    path: "/",
  };
}

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set("session", session, cookieOptions(expires));
}

export async function attachSession(
  response: NextResponse,
  payload: SessionPayload
) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);
  response.cookies.set("session", session, cookieOptions(expires));
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export function isStaff(role: UserRole) {
  return isStaffRole(role);
}
