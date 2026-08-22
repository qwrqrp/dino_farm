import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  dnaToUsdt,
  withdrawalConfig,
} from "@/lib/withdrawal-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function serializeWithdrawal(withdrawal: {
  id: string;
  currency: string;
  network: string;
  walletAddress: string;
  dnaAmount: number;
  rateUsdtPerDna: Prisma.Decimal;
  usdtAmount: Prisma.Decimal;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  note: string | null;
}) {
  return {
    id: withdrawal.id,
    currency: withdrawal.currency,
    network: withdrawal.network,
    walletAddress: withdrawal.walletAddress,
    dnaAmount: withdrawal.dnaAmount,
    rateUsdtPerDna: Number(withdrawal.rateUsdtPerDna.toString()),
    usdtAmount: Number(withdrawal.usdtAmount.toString()),
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
    updatedAt: withdrawal.updatedAt.toISOString(),
    note: withdrawal.note,
  };
}

async function listWithdrawals(userId: string) {
  const rows = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rows.map(serializeWithdrawal);
}

export async function GET() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message: "Вывод доступен только после входа через Telegram.",
        },
        { status: 401 },
      );
    }

    const [balance, withdrawals] = await Promise.all([
      prisma.balance.findUnique({
        where: { userId: player.userId },
        select: { dna: true },
      }),
      listWithdrawals(player.userId),
    ]);

    if (!balance) {
      return NextResponse.json(
        { ok: false, error: "BALANCE_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        config: {
          currency: withdrawalConfig.currency,
          usdtPerDna: withdrawalConfig.usdtPerDna,
          minDna: withdrawalConfig.minDna,
        },
        balance: {
          dna: balance.dna,
        },
        withdrawals,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/withdrawals failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load withdrawals" },
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
          message: "Вывод доступен только после входа через Telegram.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      dnaAmount?: unknown;
      network?: unknown;
      walletAddress?: unknown;
      requestKey?: unknown;
    };

    const dnaAmount =
      typeof body.dnaAmount === "number"
        ? body.dnaAmount
        : Number(body.dnaAmount);

    const network =
      typeof body.network === "string"
        ? body.network.trim()
        : "";

    const walletAddress =
      typeof body.walletAddress === "string"
        ? body.walletAddress.trim()
        : "";

    const requestKey =
      typeof body.requestKey === "string"
        ? body.requestKey.trim()
        : "";

    if (!Number.isFinite(dnaAmount)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_DNA_AMOUNT",
          message: "Введите корректное количество DNA.",
        },
        { status: 400 },
      );
    }

    if (dnaAmount < withdrawalConfig.minDna) {
      return NextResponse.json(
        {
          ok: false,
          error: "MIN_WITHDRAWAL",
          message: `Минимальная сумма вывода — ${withdrawalConfig.minDna} DNA.`,
        },
        { status: 400 },
      );
    }

    if (dnaAmount > 1_000_000_000) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_DNA_AMOUNT",
          message: "Сумма вывода слишком велика.",
        },
        { status: 400 },
      );
    }

    if (network.length < 2 || network.length > 32) {
      return NextResponse.json(
        {
          ok: false,
          error: "NETWORK_REQUIRED",
          message: "Укажите сеть USDT.",
        },
        { status: 400 },
      );
    }

    if (walletAddress.length < 8 || walletAddress.length > 180) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_WALLET",
          message: "Проверьте адрес кошелька USDT.",
        },
        { status: 400 },
      );
    }

    if (requestKey.length < 8 || requestKey.length > 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_REQUEST_KEY",
          message: "Некорректный ключ запроса.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.withdrawal.findUnique({
      where: { requestKey },
    });

    if (existing) {
      if (existing.userId !== player.userId) {
        return NextResponse.json(
          { ok: false, error: "REQUEST_KEY_CONFLICT" },
          { status: 409 },
        );
      }

      const balance = await prisma.balance.findUnique({
        where: { userId: player.userId },
        select: { dna: true },
      });

      return NextResponse.json({
        ok: true,
        duplicate: true,
        withdrawal: serializeWithdrawal(existing),
        balance: {
          dna: balance?.dna ?? 0,
        },
      });
    }

    const usdtAmount = dnaToUsdt(dnaAmount);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const balance = await tx.balance.findUnique({
              where: { userId: player.userId },
              select: { dna: true },
            });

            if (!balance) {
              throw new Error("BALANCE_NOT_FOUND");
            }

            if (balance.dna < dnaAmount) {
              throw new Error("INSUFFICIENT_DNA");
            }

            const withdrawal = await tx.withdrawal.create({
              data: {
                id: randomUUID(),
                userId: player.userId,
                requestKey,
                currency: withdrawalConfig.currency,
                network,
                walletAddress,
                dnaAmount,
                rateUsdtPerDna: new Prisma.Decimal(
                  withdrawalConfig.usdtPerDna.toFixed(8),
                ),
                usdtAmount: new Prisma.Decimal(
                  usdtAmount.toFixed(8),
                ),
                status: "PENDING",
              },
            });

            const updatedBalance = await tx.balance.update({
              where: { userId: player.userId },
              data: {
                dna: {
                  decrement: dnaAmount,
                },
              },
              select: { dna: true },
            });

            return {
              withdrawal,
              balance: updatedBalance,
            };
          },
          { isolationLevel: "Serializable" },
        );

        return NextResponse.json(
          {
            ok: true,
            duplicate: false,
            withdrawal: serializeWithdrawal(result.withdrawal),
            balance: {
              dna: result.balance.dna,
            },
            message:
              "Заявка создана. DNA зарезервирована до проверки выплаты.",
          },
          { status: 201 },
        );
      } catch (error) {
        const prismaCode = getPrismaCode(error);

        if (prismaCode === "P2034" && attempt < 3) {
          continue;
        }

        if (prismaCode === "P2002") {
          const duplicate = await prisma.withdrawal.findUnique({
            where: { requestKey },
          });

          if (duplicate && duplicate.userId === player.userId) {
            const balance = await prisma.balance.findUnique({
              where: { userId: player.userId },
              select: { dna: true },
            });

            return NextResponse.json({
              ok: true,
              duplicate: true,
              withdrawal: serializeWithdrawal(duplicate),
              balance: {
                dna: balance?.dna ?? 0,
              },
            });
          }
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "TRY_AGAIN",
        message: "Попробуйте отправить заявку ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("POST /api/withdrawals failed:", error);

    if (error instanceof Error) {
      if (error.message === "BALANCE_NOT_FOUND") {
        return NextResponse.json(
          {
            ok: false,
            error: "BALANCE_NOT_FOUND",
            message: "Баланс игрока не найден.",
          },
          { status: 404 },
        );
      }

      if (error.message === "INSUFFICIENT_DNA") {
        return NextResponse.json(
          {
            ok: false,
            error: "INSUFFICIENT_DNA",
            message: "Недостаточно DNA для вывода.",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create withdrawal" },
      { status: 500 },
    );
  }
}
