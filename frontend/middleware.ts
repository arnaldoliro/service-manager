import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isTokenExpiredFromCookie(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isAuthed = token && !isTokenExpiredFromCookie(token);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthed ? "/dashboard" : "/login", request.url)
    );
  }

  if (!isAuthed && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthed && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
