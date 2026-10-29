import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  const url = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Todo menos login, assets de Next, manifest, íconos, el service worker y el cron (que valida CRON_SECRET).
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|sw.js|api/cron).*)",
  ],
};
