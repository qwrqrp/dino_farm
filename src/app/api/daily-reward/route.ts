import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_RESET_MS = 48 * 60 * 60 * 1000;

const REWARDS = [100, 150, 200, 250, 300, 400, 500] as const;

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

function buildStatus(reward: {
  streak: number;
  lastClaimedAt: Date | null;
  totalClaims: number;
  totalCoins: number;
} | null) {
  const now = Date.now();
  const lastClaimedAt = reward?.lastClaimedAt?.getTime() ?? null;

  const canClaim =
    lastClaimedAt === null ||
    now - lastClaimedAt >= DAY_MS;

  const nextClaimAt =
    lastClaimedAt === null
      ? null
      : new Date(lastClaimedAt + DAY_MS).toISOString();

  const missed =
    lastClaimedAt !== null &&
    now - lastClaimedAt >= STREAK_RESET_MS;

  const currentStreak = reward?.streak ?? 0;

  const nextDay =
    missed || currentStreak <= 0 || currentStreak >= REWARDS.length
      ? 1
      : currentStreak + 1;

  return {
    canClaim,
    nextClaimAt,
    streak: currentStreak,
    nextDay,
    nextRewardCoins: REWARDS[nextDay - 1],
    rewards: [...REWARDS],
    totalClaims: reward?.totalClaims ?? 0,
    totalCoins: reward?.totalCoins ?? 0,
  };
}

export async function GET() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message: "Ежедневный бонус доступен только через Telegram.",
        },
        { status: 401 },
      );
    }

    const [reward, balance] = await Promise.all([
      prisma.dailyReward.findUnique({
        where: { userId: player.userId },
        select: {
          streak: true,
          lastClaimedAt: true,
          totalClaims: true,
          totalCoins: true,
        },
      }),
      prisma.balance.findUnique({
        where: { userId: player.userId },
        select: { coins: true },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        ...buildStatus(reward),
        balance: {
          coins: balance?.coins ?? 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/daily-reward failed:", error);

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_LOAD_DAILY_REWARD" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message: "Ежедневный бонус доступен только через Telegram.",
        },
        { status: 401 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const now = new Date();

            const current = await tx.dailyReward.findUnique({
              where: { userId: player.userId },
            });

            const status = buildStatus(
              current
                ? {
                    streak: current.streak,
                    lastClaimedAt: current.lastClaimedAt,
                    totalClaims: current.totalClaims,
                    totalCoins: current.totalCoins,
                  }
                : null,
            );

            if (!status.canClaim) {
              throw new Error(
                `COOLDOWN:${status.nextClaimAt ?? ""}`,
              );
            }

            const rewardCoins = status.nextRewardCoins;
            const nextStreak = status.nextDay;

            const reward = current
              ? await tx.dailyReward.update({
                  where: { userId: player.userId },
                  data: {
                    streak: nextStreak,
                    lastClaimedAt: now,
                    totalClaims: {
                      increment: 1,
                    },
                    totalCoins: {
                      increment: rewardCoins,
                    },
                  },
                })
              : await tx.dailyReward.create({
                  data: {
                    id: randomUUID(),
                    userId: player.userId,
                    streak: 1,
                    lastClaimedAt: now,
                    totalClaims: 1,
                    totalCoins: rewardCoins,
                  },
                });

            const balance = await tx.balance.update({
              where: { userId: player.userId },
              data: {
                coins: {
                  increment: rewardCoins,
                },
              },
              select: { coins: true },
            });

            return {
              rewardCoins,
              reward,
              balance,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return NextResponse.json({
          ok: true,
          claimedCoins: result.rewardCoins,
          ...buildStatus({
            streak: result.reward.streak,
            lastClaimedAt: result.reward.lastClaimedAt,
            totalClaims: result.reward.totalClaims,
            totalCoins: result.reward.totalCoins,
          }),
          balance: {
            coins: result.balance.coins,
          },
        });
      } catch (error) {
        if (getPrismaCode(error) === "P2034" && attempt < 3) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "TRY_AGAIN",
        message: "Попробуйте получить бонус ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("POST /api/daily-reward failed:", error);

    if (
      error instanceof Error &&
      error.message.startsWith("COOLDOWN:")
    ) {
      const nextClaimAt =
        error.message.slice("COOLDOWN:".length) || null;

      return NextResponse.json(
        {
          ok: false,
          error: "DAILY_REWARD_COOLDOWN",
          message: "Сегодняшний бонус уже получен.",
          nextClaimAt,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_CLAIM_DAILY_REWARD" },
      { status: 500 },
    );
  }
}
