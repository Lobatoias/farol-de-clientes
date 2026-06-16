// Sessão assinada que roda em EDGE (middleware) e NODE (rotas/server comps).
// Sem "server-only" e sem APIs de Node — só Web Crypto/btoa/atob/TextEncoder.

export type Role = "admin" | "gestor" | "leitor";
export type Section = "dashboard" | "estrategico" | "financeiro" | "saidas";

export const ALL_SECTIONS: Section[] = [
  "dashboard",
  "estrategico",
  "financeiro",
  "saidas",
];

export const SECTION_LABEL: Record<Section, string> = {
  dashboard: "Dashboard",
  estrategico: "Estratégico",
  financeiro: "Financeiro",
  saidas: "Saídas",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  gestor: "Gestor",
  leitor: "Leitor",
};

export interface SessionData {
  uid: number; // 0 = admin via senha-mestra (bootstrap)
  name: string;
  role: Role;
  /** Seções permitidas (ignorado quando role = admin, que vê tudo). */
  sections: Section[];
  exp: number; // epoch ms
}

const SECRET =
  process.env.FAROL_SECRET || process.env.FAROL_PASSWORD || "dev-secret-change-me";

/**
 * Assinatura determinística (FNV-1a duplo). Não é criptografia forte, mas
 * impede forjar o papel sem conhecer o SECRET. Roda em edge e node.
 */
export function signValue(value: string): string {
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

function b64urlEncode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSession(data: SessionData): string {
  const payload = b64urlEncode(JSON.stringify(data));
  return `${payload}.${signValue(payload)}`;
}

export function decodeSession(cookie: string | undefined): SessionData | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  if (signValue(payload) !== sig) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload)) as SessionData;
    if (!data || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!Array.isArray(data.sections)) data.sections = [];
    return data;
  } catch {
    return null;
  }
}

/** Qual seção/role uma rota exige (null = não é gated por seção). */
export function requiredSection(pathname: string): Section | "admin" | null {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/cliente")) return "dashboard";
  if (pathname.startsWith("/estrategico")) return "estrategico";
  if (pathname.startsWith("/financeiro")) return "financeiro";
  if (pathname.startsWith("/saidas")) return "saidas";
  if (pathname.startsWith("/config")) return "admin";
  if (pathname.startsWith("/setup")) return "admin";
  return null;
}

const SECTION_PATH: Record<Section, string> = {
  dashboard: "/",
  estrategico: "/estrategico",
  financeiro: "/financeiro",
  saidas: "/saidas",
};

/** Para onde mandar o usuário quando ele não tem acesso à rota pedida. */
export function landingPath(session: SessionData): string {
  if (session.role === "admin") return "/";
  const first = session.sections[0];
  return first ? SECTION_PATH[first] : "/login";
}

/** Pode ver a seção? (admin sempre pode) */
export function canAccess(
  session: SessionData,
  need: Section | "admin" | null
): boolean {
  if (!need) return true;
  if (session.role === "admin") return true;
  if (need === "admin") return false;
  return session.sections.includes(need);
}
