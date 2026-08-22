import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import { getDinosaurConfig } from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message: "Профиль доступен только через Telegram.",
        },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: player.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        balance: {
          select: {
            coins: true,
            dna: true,
          },
        },
        nest: {
          select: {
            capacity: true,
            currentEggs: true,
          },
        },
        dinosaurs: {
          select: {
            level: true,
          },
        },
        gameStats: {
          select: {
            totalEggsCollected: true,
          },
        },
        dailyReward: {
          select: {
            streak: true,
            totalClaims: true,
            totalCoins: true,
          },
        },
        _count: {
          select: {
            taskClaims: true,
            withdrawals: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "USER_NOT_FOUND",
          message: "Игрок не найден.",
        },
        { status: 404 },
      );
    }

    let maxLevel = 0;
    let dailyCoins = 0;
    let dailyDna = 0;
    let eggsPerHour = 0;
    let equivalentFarmCostCoins = 0;

    const levelCounts = Array.from({ length: 16 }, () => 0);

    for (const dinosaur of user.dinosaurs) {
      const config = getDinosaurConfig(dinosaur.level);
      if (!config) continue;

      maxLevel = Math.max(maxLevel, dinosaur.level);
      dailyCoins += config.dailyCoins;
      dailyDna += config.dailyDna;
      eggsPerHour += config.eggsPerHour;
      equivalentFarmCostCoins += config.equivalentCostCoins;

      if (dinosaur.level >= 1 && dinosaur.level <= 16) {
        levelCounts[dinosaur.level - 1] += 1;
      }
    }

    const [referralsInvited, referralEarned, withdrawalStats] =
      await Promise.all([
        prisma.referral.count({
          where: {
            inviterId: player.userId,
          },
        }),
        prisma.referral.aggregate({
          where: {
            inviterId: player.userId,
          },
          _sum: {
            inviterRewardCoins: true,
          },
        }),
        prisma.withdrawal.groupBy({
          by: ["status"],
          where: {
            userId: player.userId,
          },
          _count: {
            _all: true,
          },
          _sum: {
            dnaAmount: true,
            usdtAmount: true,
          },
        }),
      ]);

    const withdrawals = {
      total: user._count.withdrawals,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      paidUsdt: 0,
      totalDnaRequested: 0,
    };

    for (const row of withdrawalStats) {
      const count = row._count._all;

      if (row.status === "PENDING") withdrawals.pending = count;
      if (row.status === "APPROVED") withdrawals.approved = count;
      if (row.status === "PAID") {
        withdrawals.paid = count;
        withdrawals.paidUsdt = Number(
          row._sum.usdtAmount?.toString() ?? "0",
        );
      }
      if (row.status === "REJECTED") withdrawals.rejected = count;

      withdrawals.totalDnaRequested += row._sum.dnaAmount ?? 0;
    }

    return NextResponse.json(
      {
        ok: true,
        player: {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt.toISOString(),
        },
        balance: {
          coins: user.balance?.coins ?? 0,
          dna: user.balance?.dna ?? 0,
        },
        farm: {
          dinosaurCount: user.dinosaurs.length,
          maxLevel,
          levelCounts,
          eggsPerHour,
          dailyCoins,
          dailyDna,
          equivalentFarmCostCoins,
          nestCapacity: user.nest?.capacity ?? 0,
          currentEggs: user.nest?.currentEggs ?? 0,
          totalEggsCollected:
            user.gameStats?.totalEggsCollected ?? 0,
        },
        progress: {
          tasksCompleted: user._count.taskClaims,
          dailyStreak: user.dailyReward?.streak ?? 0,
          dailyClaims: user.dailyReward?.totalClaims ?? 0,
          dailyCoinsEarned: user.dailyReward?.totalCoins ?? 0,
        },
        referrals: {
          invited: referralsInvited,
          coinsEarned:
            referralEarned._sum.inviterRewardCoins ?? 0,
        },
        withdrawals,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/profile failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_PROFILE",
        message: "Не удалось загрузить профиль.",
      },
      { status: 500 },
    );
  }
}
