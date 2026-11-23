import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("crm_token")?.value

  // Rutas públicas que no requieren autenticación
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth")
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")

  if (isStaticAsset) {
    return NextResponse.next()
  }

  // Si no tiene token y busca acceder a la aplicación privada
  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Si ya tiene sesión activa e intenta ir al login
  if (token && isAuthPage) {
    const dashboardUrl = new URL("/dashboard/analytics", request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto archivos estáticos
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
