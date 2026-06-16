import "server-only";
import { cookies } from "next/headers";
import {
  encodeSession,
  decodeSession,
  type SessionData,
} from "./session";

const COOKIE_NAME = "farol_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const PASSWORD = process.env.FAROL_PASSWORD;

export const AUTH_ENABLED = !!PASSWORD;

/** Senha-mestra do env = login de admin (bootstrap / emergência). */
export function checkMasterPassword(input: string): boolean {
  if (!PASSWORD) return false;
  return input === PASSWORD;
}

/** Lê a sessão atual do cookie (ou null). */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  return decodeSession(cookie);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!AUTH_ENABLED) return true; // dev sem senha
  return (await getSession()) !== null;
}

export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function sessionMaxAgeMs(): number {
  return COOKIE_MAX_AGE * 1000;
}
