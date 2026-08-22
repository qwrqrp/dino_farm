import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const number = Number(
    typeof value === "object" &&
      value !== null &&
      "toString" in value
      ? value.toString()
      : value,
  );

  return Number.isFinite(number) ? number : 0;
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

    const since24Hours = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    );

    const realPlayersWhere = {
      telegramId: {
        not: null,
      },
      NOT: {
        id: "demo-user-1",
      },
    } as const;

    const [
      totalPlayers,
      newPlayers24h,
      balances,
      dinosaurCount,
      dinosaurMax,
      nestTotals,
      eggStats,
      referrals,
      taskClaims,
      achievementClaims,
      withdrawalStatus,
      paidWithdrawalTotals,
    ] = await Promise.all([
      prisma.user.count({
        where: realPlayersWhere,
      }),

      prisma.user.count({
        where: {
          ...realPlayersWhere,
          createdAt: {
            gte: since24Hours,
          },
        },
      }),

      prisma.balance.aggregate({
        _sum: {
          coins: true,
          dna: true,
        },
      }),

      prisma.dinosaur.count(),

      prisma.dinosaur.aggregate({
        _max: {
          level: true,
        },
      }),

      prisma.nest.aggregate({
        _sum: {
          capacity: true,
          currentEggs: true,
        },
        _avg: {
          capacity: true,
        },
      }),

      prisma.gameStats.aggregate({
        _sum: {
          totalEggsCollected: true,
        },
      }),

      prisma.referral.count(),

      prisma.taskClaim.count(),

      prisma.achievementClaim.count(),

      prisma.withdrawal.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
        _sum: {
          dnaAmount: true,
          usdtAmount: true,
        },
      }),

      prisma.withdrawal.aggregate({
        where: {
          status: "PAID",
        },
        _sum: {
          dnaAmount: true,
          usdtAmount: true,
        },
      }),
    ]);

    const withdrawals = {
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      pendingDna: 0,
      approvedDna: 0,
    };

    for (const row of withdrawalStatus) {
      const count = row._count._all;
      const dna = row._sum.dnaAmount ?? 0;

      if (row.status === "PENDING") {
        withdrawals.pending = count;
        withdrawals.pendingDna = dna;
      }

      if (row.status === "APPROVED") {
        withdrawals.approved = count;
        withdrawals.approvedDna = dna;
      }

      if (row.status === "PAID") {
        withdrawals.paid = count;
      }

      if (row.status === "REJECTED") {
        withdrawals.rejected = count;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),

        players: {
          total: totalPlayers,
          new24h: newPlayers24h,
        },

        economy: {
          coins:
            balances._sum.coins ?? 0,
          dna:
            balances._sum.dna ?? 0,
        },

        farm: {
          dinosaurs: dinosaurCount,
          maxDinoLevel:
            dinosaurMax._max.level ?? 0,
          nestCapacity:
            nestTotals._sum.capacity ?? 0,
          averageNestCapacity:
            nestTotals._avg.capacity ?? 0,
          eggsInNests:
            nestTotals._sum.currentEggs ?? 0,
          totalEggsCollected:
            eggStats._sum.totalEggsCollected ??
            0,
        },

        activity: {
          referrals,
          taskClaims,
          achievementClaims,
        },

        withdrawals: {
          ...withdrawals,
          paidDna:
            paidWithdrawalTotals._sum
              .dnaAmount ?? 0,
          paidUsdt: decimalToNumber(
            paidWithdrawalTotals._sum
              .usdtAmount,
          ),
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
      "GET /api/admin/dashboard failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_DASHBOARD",
        message:
          "Не удалось загрузить обзор проекта.",
      },
      { status: 500 },
    );
  }
}
