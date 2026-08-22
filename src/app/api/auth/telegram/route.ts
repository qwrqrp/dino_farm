import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { validateTelegramInitData } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INITIAL_NEST_CAPACITY = 250_000;
const STARTER_DINO_LEVEL = 1;

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "auth/telegram",
    method: "POST",
    configured: Boolean(
      process.env.TELEGRAM_BOT_TOKEN && process.env.SESSION_SECRET,
    ),
  });
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!botToken || !sessionSecret) {
      return NextResponse.json(
        { ok: false, error: "Telegram auth is not configured" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { initData?: unknown };
    const initData = typeof body.initData === "string" ? body.initData : "";

    if (!initData) {
      return NextResponse.json(
        { ok: false, error: "initData is required" },
        { status: 400 },
      );
    }

    const maxAgeSeconds = Number(
      process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS ?? 86_400,
    );

    const validated = validateTelegramInitData(
      initData,
      botToken,
      Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 86_400,
    );

    const tg = validated.user;
    const telegramId = String(tg.id);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      let dbUser = await tx.user.findUnique({
        where: { telegramId },
      });

      if (!dbUser) {
        dbUser = await tx.user.create({
          data: {
            id: `tg_${telegramId}`,
            telegramId,
            username: tg.username ?? null,
            firstName: tg.first_name,
            lastName: tg.last_name ?? null,
            createdAt: now,
            updatedAt: now,
            balance: {
              create: {
                id: `bal_${telegramId}`,
                // Never copy demo balances to real users.
                coins: 0,
                dna: 0,
              },
            },
            nest: {
              create: {
                id: `nest_${telegramId}`,
                currentEggs: 0,
                capacity: INITIAL_NEST_CAPACITY,
                lastProductionAt: now,
              },
            },
            dinosaurs: {
              create: {
                id: randomUUID(),
                level: STARTER_DINO_LEVEL,
                boardSlot: 0,
                createdAt: now,
              },
            },
          },
        });
      } else {
        dbUser = await tx.user.update({
          where: { id: dbUser.id },
          data: {
            username: tg.username ?? null,
            firstName: tg.first_name,
            lastName: tg.last_name ?? null,
            updatedAt: now,
          },
        });

        await tx.balance.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            id: `bal_${telegramId}`,
            userId: dbUser.id,
            coins: 0,
            dna: 0,
          },
        });

        await tx.nest.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            id: `nest_${telegramId}`,
            userId: dbUser.id,
            currentEggs: 0,
            capacity: INITIAL_NEST_CAPACITY,
            lastProductionAt: now,
          },
        });

        const dinoCount = await tx.dinosaur.count({
          where: { userId: dbUser.id },
        });

        if (dinoCount === 0) {
          await tx.dinosaur.create({
            data: {
              id: randomUUID(),
              userId: dbUser.id,
              level: STARTER_DINO_LEVEL,
              boardSlot: 0,
              createdAt: now,
            },
          });
        }
      }

      return dbUser;
    });

    const sessionToken = createSessionToken(
      user.id,
      telegramId,
      sessionSecret,
    );

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      startParam: validated.startParam ?? null,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/telegram failed:", error);

    const message = error instanceof Error ? error.message : "Telegram auth failed";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 401 },
    );
  }
}
