import { prisma } from "@/lib/prisma";

const TELEGRAM_TIMEOUT_MS = 4_000;

export async function sendTelegramToUser(
  userId: string,
  text: string,
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token || !text.trim()) {
    return false;
  }
  
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          telegramId: true,
        },
      });

    if (!user?.telegramId) {
      return false;
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        TELEGRAM_TIMEOUT_MS,
      );

    try {
      const response =
        await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              chat_id:
                user.telegramId,
              text,
              disable_web_page_preview:
                true,
            }),
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

      const data =
        (await response
          .json()
          .catch(() => ({}))) as {
          ok?: boolean;
          description?: string;
        };

      if (
        !response.ok ||
        data.ok !== true
      ) {
        console.error(
          "Telegram notification failed:",
          data.description ??
            `HTTP ${response.status}`,
        );

        return false;
      }

      return true;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    // Telegram must never block game economy operations.
    console.error(
      "Telegram notification error:",
      error instanceof Error
        ? error.message
        : error,
    );

    return false;
  }
}

export function formatTelegramUsdt(
  value: number,
) {
  return Number(value).toLocaleString(
    "ru-RU",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    },
  );
}

export function formatTelegramDna(
  value: number,
) {
  return Number(value).toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits: 4,
    },
  );
}
