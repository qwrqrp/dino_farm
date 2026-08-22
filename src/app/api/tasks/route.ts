import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TaskMetric =
  | "EGGS_COLLECTED"
  | "DINO_COUNT"
  | "MAX_DINO_LEVEL"
  | "DAILY_CLAIMS"
  | "NEST_CAPACITY";

type TaskDefinition = {
  code: string;
  icon: string;
  title: string;
  description: string;
  metric: TaskMetric;
  target: number;
  rewardCoins: number;
};

const TASKS: readonly TaskDefinition[] = [
  {
    code: "EGGS_1000",
    icon: "🥚",
    title: "Собери 1 000 яиц",
    description: "Соберите суммарно 1 000 яиц из гнезда.",
    metric: "EGGS_COLLECTED",
    target: 1000,
    rewardCoins: 200,
  },
  {
    code: "DINO_3",
    icon: "🦕",
    title: "Собери 3 динозавров",
    description: "Держите на игровой доске минимум 3 динозавров.",
    metric: "DINO_COUNT",
    target: 3,
    rewardCoins: 300,
  },
  {
    code: "LEVEL_3",
    icon: "🧬",
    title: "Создай динозавра Lv.3",
    description: "Объединяйте одинаковых динозавров и получите уровень 3.",
    metric: "MAX_DINO_LEVEL",
    target: 3,
    rewardCoins: 500,
  },
  {
    code: "DAILY_3",
    icon: "🎁",
    title: "Забери 3 ежедневных бонуса",
    description: "Получите ежедневную награду три раза.",
    metric: "DAILY_CLAIMS",
    target: 3,
    rewardCoins: 500,
  },
  {
    code: "NEST_300K",
    icon: "🪺",
    title: "Расширь гнездо",
    description: "Увеличьте вместимость гнезда до 300 000 яиц.",
    metric: "NEST_CAPACITY",
    target: 300000,
    rewardCoins: 700,
  },
  {
    code: "EGGS_10000",
    icon: "🏆",
    title: "Собери 10 000 яиц",
    description: "Соберите суммарно 10 000 яиц из гнезда.",
    metric: "EGGS_COLLECTED",
    target: 10000,
    rewardCoins: 1200,
  },
] as const;

type ProgressSnapshot = {
  eggsCollected: number;
  dinoCount: number;
  maxDinoLevel: number;
  dailyClaims: number;
  nestCapacity: number;
};

function getProgress(
  task: TaskDefinition,
  snapshot: ProgressSnapshot,
) {
  if (task.metric === "EGGS_COLLECTED") {
    return snapshot.eggsCollected;
  }

  if (task.metric === "DINO_COUNT") {
    return snapshot.dinoCount;
  }

  if (task.metric === "MAX_DINO_LEVEL") {
    return snapshot.maxDinoLevel;
  }

  if (task.metric === "DAILY_CLAIMS") {
    return snapshot.dailyClaims;
  }

  return snapshot.nestCapacity;
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
  const [stats, dinoCount, maxLevel, daily, nest] =
    await Promise.all([
      db.gameStats.findUnique({
        where: { userId },
        select: { totalEggsCollected: true },
      }),
      db.dinosaur.count({
        where: { userId },
      }),
      db.dinosaur.aggregate({
        where: { userId },
        _max: { level: true },
      }),
      db.dailyReward.findUnique({
        where: { userId },
        select: { totalClaims: true },
      }),
      db.nest.findUnique({
        where: { userId },
        select: { capacity: true },
      }),
    ]);

  return {
    eggsCollected: stats?.totalEggsCollected ?? 0,
    dinoCount,
    maxDinoLevel: maxLevel._max.level ?? 0,
    dailyClaims: daily?.totalClaims ?? 0,
    nestCapacity: nest?.capacity ?? 0,
  };
}

function serializeTasks(
  snapshot: ProgressSnapshot,
  claimedCodes: Set<string>,
) {
  return TASKS.map((task) => {
    const rawProgress = getProgress(task, snapshot);
    const progress = Math.max(0, Math.min(rawProgress, task.target));
    const claimed = claimedCodes.has(task.code);

    return {
      code: task.code,
      icon: task.icon,
      title: task.title,
      description: task.description,
      progress,
      target: task.target,
      rewardCoins: task.rewardCoins,
      claimed,
      claimable: !claimed && rawProgress >= task.target,
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
          message: "Задания доступны только через Telegram.",
        },
        { status: 401 },
      );
    }

    const [snapshot, claims, balance] = await Promise.all([
      loadSnapshot(prisma, player.userId),
      prisma.taskClaim.findMany({
        where: { userId: player.userId },
        select: { taskCode: true },
      }),
      prisma.balance.findUnique({
        where: { userId: player.userId },
        select: { coins: true },
      }),
    ]);

    const claimedCodes = new Set(
      claims.map((claim) => claim.taskCode),
    );

    const tasks = serializeTasks(snapshot, claimedCodes);

    return NextResponse.json(
      {
        ok: true,
        tasks,
        completedCount: tasks.filter(
          (task) => task.claimed,
        ).length,
        claimableCount: tasks.filter(
          (task) => task.claimable,
        ).length,
        balance: {
          coins: balance?.coins ?? 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/tasks failed:", error);

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_LOAD_TASKS" },
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
          message: "Задания доступны только через Telegram.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      taskCode?: unknown;
    };

    const taskCode =
      typeof body.taskCode === "string"
        ? body.taskCode.trim()
        : "";

    const task = TASKS.find(
      (candidate) => candidate.code === taskCode,
    );

    if (!task) {
      return NextResponse.json(
        {
          ok: false,
          error: "TASK_NOT_FOUND",
          message: "Задание не найдено.",
        },
        { status: 404 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const existing = await tx.taskClaim.findUnique({
              where: {
                userId_taskCode: {
                  userId: player.userId,
                  taskCode: task.code,
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

            const progress = getProgress(task, snapshot);

            if (progress < task.target) {
              throw new Error("TASK_NOT_COMPLETE");
            }

            await tx.taskClaim.create({
              data: {
                id: randomUUID(),
                userId: player.userId,
                taskCode: task.code,
                rewardCoins: task.rewardCoins,
              },
            });

            const balance = await tx.balance.update({
              where: { userId: player.userId },
              data: {
                coins: {
                  increment: task.rewardCoins,
                },
              },
              select: { coins: true },
            });

            return {
              coins: balance.coins,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return NextResponse.json({
          ok: true,
          taskCode: task.code,
          rewardCoins: task.rewardCoins,
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
        message: "Попробуйте получить награду ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("POST /api/tasks failed:", error);

    if (error instanceof Error) {
      if (error.message === "ALREADY_CLAIMED") {
        return NextResponse.json(
          {
            ok: false,
            error: "ALREADY_CLAIMED",
            message: "Награда за это задание уже получена.",
          },
          { status: 409 },
        );
      }

      if (error.message === "TASK_NOT_COMPLETE") {
        return NextResponse.json(
          {
            ok: false,
            error: "TASK_NOT_COMPLETE",
            message: "Задание ещё не выполнено.",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_CLAIM_TASK" },
      { status: 500 },
    );
  }
}
