import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { getDinosaurConfig } from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PLAYERS_FOR_RANKING = 1000;
const TOP_LIMIT = 100;

type RankedPlayer = {
  userId: string;
  telegramId: string | null;
  name: string;
  username: string | null;
  dinoCount: number;
  maxLevel: number;
  dailyCoins: number;
  dailyDna: number;
  eggsPerHour: number;
  createdAt: Date;
};

function getDisplayName(user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) return fullName;
  if (user.username) return `@${user.username}`;
  return "Игрок";
}

function calculatePlayer(user: {
  id: string;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  dinosaurs: Array<{ level: number }>;
}): RankedPlayer {
  let dailyCoins = 0;
  let dailyDna = 0;
  let eggsPerHour = 0;
  let maxLevel = 0;

  for (const dinosaur of user.dinosaurs) {
    const config = getDinosaurConfig(dinosaur.level);
    if (!config) continue;

    dailyCoins += config.dailyCoins;
    dailyDna += config.dailyDna;
    eggsPerHour += config.eggsPerHour;
    maxLevel = Math.max(maxLevel, dinosaur.level);
  }

  return {
    userId: user.id,
    telegramId: user.telegramId,
    name: getDisplayName(user),
    username: user.username,
    dinoCount: user.dinosaurs.length,
    maxLevel,
    dailyCoins,
    dailyDna,
    eggsPerHour,
    createdAt: user.createdAt,
  };
}

function comparePlayers(a: RankedPlayer, b: RankedPlayer) {
  if (b.dailyCoins !== a.dailyCoins) {
    return b.dailyCoins - a.dailyCoins;
  }

  if (b.maxLevel !== a.maxLevel) {
    return b.maxLevel - a.maxLevel;
  }

  if (b.dinoCount !== a.dinoCount) {
    return b.dinoCount - a.dinoCount;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_REQUIRED",
          message: "Доступ только для администратора.",
        },
        { status: 401 },
      );
    }

    const users = await prisma.user.findMany({
      where: {
        telegramId: {
          not: null,
        },
        NOT: {
          id: "demo-user-1",
        },
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        dinosaurs: {
          select: {
            level: true,
          },
        },
      },
      take: MAX_PLAYERS_FOR_RANKING,
      orderBy: {
        createdAt: "asc",
      },
    });

    const ranked = users
      .map(calculatePlayer)
      .sort(comparePlayers)
      .slice(0, TOP_LIMIT)
      .map((player, index) => ({
        rank: index + 1,
        userId: player.userId,
        telegramId: player.telegramId,
        name: player.name,
        username: player.username,
        dinoCount: player.dinoCount,
        maxLevel: player.maxLevel,
        dailyCoins: player.dailyCoins,
        dailyDna: player.dailyDna,
        eggsPerHour: player.eggsPerHour,
        createdAt: player.createdAt.toISOString(),
      }));

    return NextResponse.json(
      {
        ok: true,
        totalPlayers: users.length,
        top: ranked,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/leaderboard failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_LEADERBOARD",
        message: "Не удалось загрузить рейтинг.",
      },
      { status: 500 },
    );
  }
}
