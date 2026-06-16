import { NextResponse, type NextRequest } from "next/server";
import {
  decodeSession,
  requiredSection,
  canAccess,
  landingPath,
} from "@/lib/session";

// === Middleware de auth + RBAC ====================================
// Roda em edge. Verifica o cookie assinado, identifica o papel e bloqueia
// rotas que o papel não pode ver (no servidor, não só escondendo a aba).
// Quando FAROL_PASSWORD não está setado, libera tudo (modo dev).

const COOKIE_NAME = "farol_auth";

export function middleware(req: NextRequest) {
  const PASSWORD = process.env.FAROL_PASSWORD;
  if (!PASSWORD) return NextResponse.next(); // dev: sem senha, libera

  const { pathname } = req.nextUrl;

  // Rotas livres sem auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname === "/api/ping" ||
    pathname.startsWith("/aprovacao") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const session = decodeSession(req.cookies.get(COOKIE_NAME)?.value);

  // Não autenticado
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // /api/config é exclusivo de admin
  if (pathname.startsWith("/api/config") && session.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Autenticado mas sem acesso à seção/role pedida
  const need = requiredSection(pathname);
  if (!canAccess(session, need)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = landingPath(session);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
