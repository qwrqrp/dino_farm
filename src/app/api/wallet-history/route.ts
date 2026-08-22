import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

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
    const player =
      await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message:
            "История баланса доступна только через Telegram.",
        },
        { status: 401 },
      );
    }

    const [
      deposits,
      withdrawals,
      successfulDeposits,
      paidWithdrawals,
    ] = await Promise.all([
      prisma.deposit.findMany({
        where: {
          userId: player.userId,
          status: {
            not: "CREATE_FAILED",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          usdAmount: true,
          baseCoins: true,
          bonusCoins: true,
          creditedCoins: true,
          bonusPercent: true,
          status: true,
          network: true,
          methodCode: true,
          createdAt: true,
          creditedAt: true,
        },
      }),

      prisma.withdrawal.findMany({
        where: {
          userId: player.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          currency: true,
          network: true,
          dnaAmount: true,
          usdtAmount: true,
          status: true,
          createdAt: true,
          processedAt: true,
        },
      }),

      prisma.deposit.aggregate({
        where: {
          userId: player.userId,
          status: "FINISHED",
          creditedAt: {
            not: null,
          },
        },
        _sum: {
          usdAmount: true,
          creditedCoins: true,
          bonusCoins: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.withdrawal.aggregate({
        where: {
          userId: player.userId,
          status: "PAID",
        },
        _sum: {
          usdtAmount: true,
          dnaAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const items = [
      ...deposits.map((item) => ({
        id: item.id,
        type: "DEPOSIT" as const,
        createdAt:
          item.createdAt.toISOString(),
        status: item.status,
        deposit: {
          usdAmount:
            decimalToNumber(
              item.usdAmount,
            ),
          baseCoins:
            item.baseCoins,
          bonusCoins:
            item.bonusCoins,
          creditedCoins:
            item.creditedCoins,
          bonusPercent:
            item.bonusPercent,
          network:
            item.network,
          methodCode:
            item.methodCode,
          creditedAt:
            item.creditedAt?.toISOString() ??
            null,
        },
        withdrawal: null,
      })),

      ...withdrawals.map((item) => ({
        id: item.id,
        type: "WITHDRAWAL" as const,
        createdAt:
          item.createdAt.toISOString(),
        status: item.status,
        deposit: null,
        withdrawal: {
          currency:
            item.currency,
          network:
            item.network,
          dnaAmount:
            item.dnaAmount,
          usdtAmount:
            decimalToNumber(
              item.usdtAmount,
            ),
          processedAt:
            item.processedAt?.toISOString() ??
            null,
        },
      })),
    ]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      )
      .slice(0, 75);

    return NextResponse.json(
      {
        ok: true,
        summary: {
          successfulDeposits:
            successfulDeposits._count
              ._all,
          depositedUsd:
            decimalToNumber(
              successfulDeposits._sum
                .usdAmount,
            ),
          creditedCoins:
            successfulDeposits._sum
              .creditedCoins ?? 0,
          bonusCoins:
            successfulDeposits._sum
              .bonusCoins ?? 0,
          paidWithdrawals:
            paidWithdrawals._count
              ._all,
          paidUsdt:
            decimalToNumber(
              paidWithdrawals._sum
                .usdtAmount,
            ),
          paidDna:
            paidWithdrawals._sum
              .dnaAmount ?? 0,
        },
        items,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/wallet-history failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_LOAD_WALLET_HISTORY",
        message:
          "Не удалось загрузить историю баланса.",
      },
      { status: 500 },
    );
  }
}
