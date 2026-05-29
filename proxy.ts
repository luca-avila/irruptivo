import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  getAdminRouteAccess,
  readAdminAuthConfig
} from "./src/admin/session";

export async function proxy(request: NextRequest) {
  const access = await getAdminRouteAccess({
    pathname: request.nextUrl.pathname,
    sessionToken: request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    config: readAdminAuthConfig()
  });

  if (access.kind !== "redirect") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = access.location;
  url.search = "";
  url.searchParams.set(
    "estado",
    access.reason === "expired" ? "sesion-vencida" : "requerido"
  );

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"]
};
