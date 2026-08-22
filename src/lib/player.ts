import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const DEMO_USER_ID = "demo-user-1";

export type PlayerContext = {
  userId: string;
  telegramId: string | null;
  authenticated: boolean;
};

export async function getPlayerContext(): Promise<PlayerContext> {
  const sessionSecret = process.env.SESSION_SECRET;

  if (sessionSecret) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const session = verifySessionToken(token, sessionSecret);

      if (session) {
        return {
          userId: session.userId,
          telegramId: session.telegramId,
          authenticated: true,
        };
      }
    }
  }

  // Temporary browser fallback while we finish Telegram-only mode.
  return {
    userId: DEMO_USER_ID,
    telegramId: null,
    authenticated: false,
  };
}
