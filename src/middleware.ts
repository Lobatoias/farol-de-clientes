import { NextResponse, type NextRequest } from "next/server";

// === Middleware de auth (cookie + senha única) =====================
// Roda em todas as rotas exceto: arquivos estáticos, /login, /api/auth/*
// Quando FAROL_PASSWORD não está setado, libera tudo (modo dev).

const COOKIE_NAME = "farol_auth";

function verifyCookie(value: string | undefined): boolean {
  if (!value) return false;
  const [ts, sig] = value.split(".");
  if (!ts || !sig) return false;
  return /^[0-9]+$/.test(ts) && /^[0-9a-f]+$/.test(sig);
}

export function middleware(req: NextRequest) {
  const PASSWORD = process.env.FAROL_PASSWORD;
  // Sem senha configurada — libera tudo (dev mode)
  if (!PASSWORD) return NextResponse.next();

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

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (verifyCookie(cookie)) return NextResponse.next();

  // Não autenticado → redireciona pra /login com `from`
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
