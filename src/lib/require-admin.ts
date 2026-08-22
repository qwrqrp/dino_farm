import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

export async function isAdminAuthenticated() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return false;

  return verifyAdminSessionToken(token, secret);
}
