import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AchievementMetric =
  | "MAX_DINO_LEVEL"
  | "EGGS_COLLECTED"
  | "TASKS_COMPLETED"
  | "DAILY_CLAIMS"
  | "REFERRALS";

type AchievementDefinition = {
  code: string;
  icon: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  rewardCoins: number;
};

const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "DINO_LV5",
    icon: "🦕",
    title: "Юный заводчик",
    description: "Получите динозавра Lv.5.",
    metric: "MAX_DINO_LEVEL",
    target: 5,
    rewardCoins: 500,
  },
  {
    code: "DINO_LV10",
    icon: "🦖",
    title: "Мастер эволюции",
    description: "Получите динозавра Lv.10.",
    metric: "MAX_DINO_LEVEL",
    target: 10,
    rewardCoins: 2500,
  },
  {
    code: "DINO_LV16",
    icon: "👑",
    title: "Король динозавров",
    description: "Получите максимального динозавра Lv.16.",
    metric: "MAX_DINO_LEVEL",
    target: 16,
    rewardCoins: 10000,
  },
  {
    code: "EGGS_100K",
    icon: "🥚",
    title: "Большой урожай",
    description: "Соберите суммарно 100 000 яиц.",
    metric: "EGGS_COLLECTED",
    target: 100000,
    rewardCoins: 1500,
  },
  {
    code: "EGGS_1M",
    icon: "🏆",
    title: "Миллион яиц",
    description: "Соберите суммарно 1 000 000 яиц.",
    metric: "EGGS_COLLECTED",
    target: 1000000,
    rewardCoins: 5000,
  },
  {
    code: "TASKS_3",
    icon: "✅",
    title: "Исполнитель",
    description: "Получите награды за 3 задания.",
    metric: "TASKS_COMPLETED",
    target: 3,
    rewardCoins: 750,
  },
  {
    code: "TASKS_6",
    icon: "🎯",
    title: "Все задачи выполнены",
    description: "Получите награды за все 6 текущих заданий.",
    metric: "TASKS_COMPLETED",
    target: 6,
    rewardCoins: 2000,
  },
  {
    code: "DAILY_7",
    icon: "🎁",
    title: "Постоянный игрок",
    description: "Получите ежедневный бонус 7 раз.",
    metric: "DAILY_CLAIMS",
    target: 7,
    rewardCoins: 1000,
  },
  {
    code: "REFERRALS_5",
    icon: "👥",
    title: "Команда фермеров",
    description: "Пригласите 5 игроков по своей реферальной ссылке.",
    metric: "REFERRALS",
    target: 5,
    rewardCoins: 1500,
  },
  {
    code: "REFERRALS_10",
    icon: "🌟",
    title: "Амбассадор фермы",
    description: "Пригласите 10 игроков по своей реферальной ссылке.",
    metric: "REFERRALS",
    target: 10,
    rewardCoins: 4000,
  },
] as const;

type ProgressSnapshot = {
  maxDinoLevel: number;
  eggsCollected: number;
  tasksCompleted: number;
  dailyClaims: number;
  referrals: number;
};

function getProgress(
  achievement: AchievementDefinition,
  snapshot: ProgressSnapshot,
) {
  if (achievement.metric === "MAX_DINO_LEVEL") {
    return snapshot.maxDinoLevel;
  }

  if (achievement.metric === "EGGS_COLLECTED") {
    return snapshot.eggsCollected;
  }

  if (achievement.metric === "TASKS_COMPLETED") {
    return snapshot.tasksCompleted;
  }

  if (achievement.metric === "DAILY_CLAIMS") {
    return snapshot.dailyClaims;
  }

  return snapshot.referrals;
}

function getPrismaCode(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

async function loadSnapshot(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
): Promise<ProgressSnapshot> {
  const [
    maxLevel,
    stats,
    tasksCompleted,
    daily,
    referrals,
  ] = await Promise.all([
    db.dinosaur.aggregate({
      where: { userId },
      _max: { level: true },
    }),
    db.gameStats.findUnique({
      where: { userId },
      select: { totalEggsCollected: true },
    }),
    db.taskClaim.count({
      where: { userId },
    }),
    db.dailyReward.findUnique({
      where: { userId },
      select: { totalClaims: true },
    }),
    db.referral.count({
      where: { inviterId: userId },
    }),
  ]);

  return {
    maxDinoLevel: maxLevel._max.level ?? 0,
    eggsCollected: stats?.totalEggsCollected ?? 0,
    tasksCompleted,
    dailyClaims: daily?.totalClaims ?? 0,
    referrals,
  };
}

function serializeAchievements(
  snapshot: ProgressSnapshot,
  claimedCodes: Set<string>,
) {
  return ACHIEVEMENTS.map((achievement) => {
    const rawProgress = getProgress(
      achievement,
      snapshot,
    );
    const progress = Math.max(
      0,
      Math.min(rawProgress, achievement.target),
    );
    const claimed = claimedCodes.has(achievement.code);

    return {
      code: achievement.code,
      icon: achievement.icon,
      title: achievement.title,
      description: achievement.description,
      progress,
      target: achievement.target,
      rewardCoins: achievement.rewardCoins,
      claimed,
      claimable:
        !claimed && rawProgress >= achievement.target,
    };
  });
}

export async function GET() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message:
            "Достижения доступны только через Telegram.",
        },
        { status: 401 },
      );
    }

    const [snapshot, claims, balance] =
      await Promise.all([
        loadSnapshot(prisma, player.userId),
        prisma.achievementClaim.findMany({
          where: { userId: player.userId },
          select: { achievementCode: true },
        }),
        prisma.balance.findUnique({
          where: { userId: player.userId },
          select: { coins: true },
        }),
      ]);

    const claimedCodes = new Set(
      claims.map((claim) => claim.achievementCode),
    );

    const achievements = serializeAchievements(
      snapshot,
      claimedCodes,
    );

    return NextResponse.json(
      {
        ok: true,
        achievements,
        claimedCount: achievements.filter(
          (achievement) => achievement.claimed,
        ).length,
        claimableCount: achievements.filter(
          (achievement) => achievement.claimable,
        ).length,
        totalCount: achievements.length,
        balance: {
          coins: balance?.coins ?? 0,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/achievements failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_ACHIEVEMENTS",
        message: "Не удалось загрузить достижения.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message:
            "Достижения доступны только через Telegram.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      achievementCode?: unknown;
    };

    const achievementCode =
      typeof body.achievementCode === "string"
        ? body.achievementCode.trim()
        : "";

    const achievement = ACHIEVEMENTS.find(
      (candidate) =>
        candidate.code === achievementCode,
    );

    if (!achievement) {
      return NextResponse.json(
        {
          ok: false,
          error: "ACHIEVEMENT_NOT_FOUND",
          message: "Достижение не найдено.",
        },
        { status: 404 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const existing =
              await tx.achievementClaim.findUnique({
                where: {
                  userId_achievementCode: {
                    userId: player.userId,
                    achievementCode: achievement.code,
                  },
                },
              });

            if (existing) {
              throw new Error("ALREADY_CLAIMED");
            }

            const snapshot = await loadSnapshot(
              tx,
              player.userId,
            );

            const progress = getProgress(
              achievement,
              snapshot,
            );

            if (progress < achievement.target) {
              throw new Error(
                "ACHIEVEMENT_NOT_COMPLETE",
              );
            }

            await tx.achievementClaim.create({
              data: {
                id: randomUUID(),
                userId: player.userId,
                achievementCode: achievement.code,
                rewardCoins: achievement.rewardCoins,
              },
            });

            const balance = await tx.balance.update({
              where: {
                userId: player.userId,
              },
              data: {
                coins: {
                  increment: achievement.rewardCoins,
                },
              },
              select: {
                coins: true,
              },
            });

            return {
              coins: balance.coins,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel
                .Serializable,
          },
        );

        return NextResponse.json({
          ok: true,
          achievementCode: achievement.code,
          rewardCoins: achievement.rewardCoins,
          balance: {
            coins: result.coins,
          },
        });
      } catch (error) {
        if (
          getPrismaCode(error) === "P2034" &&
          attempt < 3
        ) {
          continue;
        }

        if (getPrismaCode(error) === "P2002") {
          throw new Error("ALREADY_CLAIMED");
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "TRY_AGAIN",
        message:
          "Попробуйте получить награду ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error(
      "POST /api/achievements failed:",
      error,
    );

    if (error instanceof Error) {
      if (error.message === "ALREADY_CLAIMED") {
        return NextResponse.json(
          {
            ok: false,
            error: "ALREADY_CLAIMED",
            message:
              "Награда за это достижение уже получена.",
          },
          { status: 409 },
        );
      }

      if (
        error.message === "ACHIEVEMENT_NOT_COMPLETE"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "ACHIEVEMENT_NOT_COMPLETE",
            message:
              "Условие достижения ещё не выполнено.",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_CLAIM_ACHIEVEMENT",
        message:
          "Не удалось получить награду за достижение.",
      },
      { status: 500 },
    );
  }
}
