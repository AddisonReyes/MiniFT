import { NextResponse } from "next/server";

const ACCESS_COOKIE = "minift_access_token";
const REFRESH_COOKIE = "minift_refresh_token";

export async function POST() {
  const response = NextResponse.json({ message: "Signed out" });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
