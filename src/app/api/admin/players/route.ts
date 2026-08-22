import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 200;

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const query = (
      url.searchParams.get("q") ?? ""
    )
      .trim()
      .slice(0, 80);

    const where: Prisma.UserWhereInput = query
      ? {
          OR: [
            {
              username: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              firstName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              lastName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              telegramId: {
                contains: query,
              },
            },
          ],
        }
      : {
          telegramId: {
            not: null,
          },
          NOT: {
            id: "demo-user-1",
          },
        };

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: LIMIT,
      select: {
        id: true,
        telegramId: true,
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
          },
        },
        _count: {
          select: {
            taskClaims: true,
            achievementClaims: true,
            withdrawals: true,
          },
        },
      },
    });

    const userIds = users.map((user) => user.id);

    const [
      referrals,
      paidWithdrawals,
      totalPlayers,
    ] = await Promise.all([
      userIds.length > 0
        ? prisma.referral.groupBy({
            by: ["inviterId"],
            where: {
              inviterId: {
                in: userIds,
              },
            },
            _count: {
              _all: true,
            },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.withdrawal.groupBy({
            by: ["userId"],
            where: {
              userId: {
                in: userIds,
              },
              status: "PAID",
            },
            _count: {
              _all: true,
            },
            _sum: {
              usdtAmount: true,
            },
          })
        : Promise.resolve([]),
      prisma.user.count({
        where: {
          telegramId: {
            not: null,
          },
          NOT: {
            id: "demo-user-1",
          },
        },
      }),
    ]);

    const referralMap = new Map(
      referrals.map((row) => [
        row.inviterId,
        row._count._all,
      ]),
    );

    const paidWithdrawalMap = new Map(
      paidWithdrawals.map((row) => [
        row.userId,
        {
          count: row._count._all,
          usdt: Number(
            row._sum.usdtAmount?.toString() ??
              "0",
          ),
        },
      ]),
    );

    const players = users.map((user) => {
      const maxLevel =
        user.dinosaurs.length > 0
          ? Math.max(
              ...user.dinosaurs.map(
                (dino) => dino.level,
              ),
            )
          : 0;

      const paid =
        paidWithdrawalMap.get(user.id) ?? {
          count: 0,
          usdt: 0,
        };

      return {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
        coins: user.balance?.coins ?? 0,
        dna: user.balance?.dna ?? 0,
        dinosaurCount: user.dinosaurs.length,
        maxLevel,
        nestCapacity:
          user.nest?.capacity ?? 0,
        currentEggs:
          user.nest?.currentEggs ?? 0,
        totalEggsCollected:
          user.gameStats?.totalEggsCollected ??
          0,
        tasksCompleted:
          user._count.taskClaims,
        achievements:
          user._count.achievementClaims,
        dailyStreak:
          user.dailyReward?.streak ?? 0,
        dailyClaims:
          user.dailyReward?.totalClaims ?? 0,
        referrals:
          referralMap.get(user.id) ?? 0,
        withdrawals:
          user._count.withdrawals,
        paidWithdrawals:
          paid.count,
        paidUsdt:
          paid.usdt,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        totalPlayers,
        shown: players.length,
        query,
        players,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/admin/players failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_PLAYERS",
        message:
          "Не удалось загрузить игроков.",
      },
      { status: 500 },
    );
  }
}
