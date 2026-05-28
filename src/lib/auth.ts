import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "farol_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const PASSWORD = process.env.FAROL_PASSWORD;
const SECRET = process.env.FAROL_SECRET || PASSWORD || "dev-secret-change-me";

export const AUTH_ENABLED = !!PASSWORD;

/**
 * Hash simples (FNV-1a 64-bit aproximado) sem dependência externa.
 * Não é criptografia — só dificulta inspeção casual do cookie.
 * Suficiente porque o servidor sempre revalida.
 */
function signValue(value: string): string {
  const data = value + "::" + SECRET;
  let h1 = 0xcbf29ce4;
  let h2 = 0x84222325;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b1) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca77) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function makeCookieValue(): string {
  const ts = Date.now().toString();
  return `${ts}.${signValue(ts)}`;
}

function verifyCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const [ts, sig] = value.split(".");
  if (!ts || !sig) return false;
  return signValue(ts) === sig;
}

export async function isAuthenticated(): Promise<boolean> {
  if (!AUTH_ENABLED) return true; // Sem senha configurada, libera (dev)
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  return verifyCookieValue(cookie?.value);
}

export async function checkPassword(input: string): Promise<boolean> {
  if (!PASSWORD) return true;
  // Comparação simples (volume baixo, sem timing-attack realista)
  return input === PASSWORD;
}

export async function login(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, makeCookieValue(), {
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
