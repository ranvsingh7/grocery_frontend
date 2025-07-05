import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Only /auth is public, all other routes are protected
  const isPublicPath = path === "/auth";
  const token = req.cookies.get("token")?.value || "";


  // Function to decode JWT token (robust)
  function decodeJWT(token: string | undefined): { header: any; payload: any } | null {
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      function base64UrlDecode(str: string) {
        str = str.replace(/-/g, "+").replace(/_/g, "/");
        while (str.length % 4) str += "=";
        return atob(str);
      }
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      return { header, payload };
    } catch (error) {
      // Error decoding JWT
      return null;
    }
  }

  const decoded = decodeJWT(token);

  // Decoded Token: userid check

  // Function to check if token is expired
  function isTokenExpired(decodedToken: { payload: { exp: number } }) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    return decodedToken.payload.exp < currentTimestamp;
  }

  // Redirect if token is expired
  if (decoded && isTokenExpired(decoded)) {
    const response = NextResponse.redirect(new URL("/auth", req.nextUrl));
    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    return response;
  }

  // Redirect logged-in users away from /auth to their dashboard based on role
  if (path === "/auth" && token) {
    const userType = decoded?.payload?.userType || decoded?.payload?.role;
    console.log("User Type:", userType);
    if (userType === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  // Restrict normal users from accessing admin panel
  if (path.startsWith("/admin") && decoded?.payload?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Redirect to login if accessing protected route without token
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/auth", req.nextUrl));
  }

  // Allow access to public route
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
