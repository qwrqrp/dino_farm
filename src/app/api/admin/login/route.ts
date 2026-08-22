import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminKey,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: unknown };
    const key = typeof body.key === "string" ? body.key.trim() : "";

    if (!key || !verifyAdminKey(key)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_ADMIN_KEY",
          message: "Неверный ключ администратора.",
        },
        { status: 401 },
      );
    }

    const secret = process.env.SESSION_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          ok: false,
          error: "SESSION_SECRET_MISSING",
          message: "SESSION_SECRET не настроен.",
        },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: createAdminSessionToken(secret),
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/login failed:", error);

    return NextResponse.json(
      { ok: false, error: "ADMIN_LOGIN_FAILED" },
      { status: 500 },
    );
  }
}
