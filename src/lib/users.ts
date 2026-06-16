import "server-only";
import bcrypt from "bcryptjs";
import { getSupabase } from "./supabase";
import { ALL_SECTIONS, type Role, type Section } from "./session";

export interface AppUser {
  id: number;
  email: string;
  name?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

interface AppUserRow {
  id: number;
  email: string;
  name: string | null;
  password_hash: string;
  role: string;
  active: boolean;
  created_at: string;
}

function rowToUser(r: AppUserRow): AppUser {
  return {
    id: r.id,
    email: r.email,
    name: r.name ?? undefined,
    role: (["admin", "gestor", "leitor"].includes(r.role) ? r.role : "leitor") as Role,
    active: r.active,
    createdAt: r.created_at,
  };
}

export interface AppSettings {
  language: string;
  timezone: string;
  roleAccess: Record<string, Section[]>;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "pt-BR",
  timezone: "America/Sao_Paulo",
  roleAccess: { gestor: ["dashboard", "estrategico"], leitor: ["dashboard"] },
};

export async function getSettings(): Promise<AppSettings> {
  const sb = getSupabase();
  if (!sb) return DEFAULT_SETTINGS;
  const { data, error } = await sb
    .from("app_settings")
    .select("language, timezone, role_access")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    language: data.language ?? DEFAULT_SETTINGS.language,
    timezone: data.timezone ?? DEFAULT_SETTINGS.timezone,
    roleAccess: (data.role_access as Record<string, Section[]>) ?? DEFAULT_SETTINGS.roleAccess,
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase indisponível");
  const row: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (patch.language !== undefined) row.language = patch.language;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.roleAccess !== undefined) row.role_access = patch.roleAccess;
  const { error } = await sb.from("app_settings").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/** Seções que um papel enxerga (admin = tudo). */
export function sectionsForRole(role: Role, settings: AppSettings): Section[] {
  if (role === "admin") return [...ALL_SECTIONS];
  const list = settings.roleAccess[role];
  return Array.isArray(list) && list.length ? list : ["dashboard"];
}

export async function listUsers(): Promise<AppUser[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("app_users")
    .select("id, email, name, password_hash, role, active, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[Users] list error:", error);
    return [];
  }
  return ((data ?? []) as AppUserRow[]).map(rowToUser);
}

/** Verifica credenciais. Retorna o usuário (sem hash) ou null. */
export async function verifyUser(
  email: string,
  password: string
): Promise<AppUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("app_users")
    .select("id, email, name, password_hash, role, active, created_at")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  const row = data as AppUserRow;
  if (!row.active) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return rowToUser(row);
}

export async function createUser(input: {
  email: string;
  name?: string;
  role: Role;
  password: string;
}): Promise<AppUser> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase indisponível");
  const hash = bcrypt.hashSync(input.password, 10);
  const { data, error } = await sb
    .from("app_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name?.trim() || null,
      password_hash: hash,
      role: input.role,
    })
    .select("id, email, name, password_hash, role, active, created_at")
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) throw new Error("E-mail já cadastrado");
    throw new Error(error.message);
  }
  return rowToUser(data as AppUserRow);
}

export async function updateUser(
  id: number,
  patch: { role?: Role; active?: boolean; password?: string }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase indisponível");
  const row: Record<string, unknown> = {};
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.password) row.password_hash = bcrypt.hashSync(patch.password, 10);
  if (Object.keys(row).length === 0) return;
  const { error } = await sb.from("app_users").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteUser(id: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase indisponível");
  const { error } = await sb.from("app_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
