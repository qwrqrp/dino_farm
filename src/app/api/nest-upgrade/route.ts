import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  NEST_UPGRADE_TIERS,
  getNextNestUpgrade,
} from "@/lib/game-config";

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

function serializeNext(
  currentCapacity: number,
) {
  const next = getNextNestUpgrade(currentCapacity);

  return next
    ? {
        capacity: next.capacity,
        priceCoins: next.priceCoins,
        addedCapacity:
          next.capacity - currentCapacity,
      }
    : null;
}

export async function GET() {
  try {
    const player = await getPlayerContext();

    const user = await prisma.user.findUnique({
      where: { id: player.userId },
      select: {
        balance: {
          select: { coins: true },
        },
        nest: {
          select: { capacity: true },
        },
      },
    });

    if (!user?.balance || !user.nest) {
      return NextResponse.json(
        {
          ok: false,
          error: "PLAYER_STATE_NOT_FOUND",
          message: "Данные игрока не найдены.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        currentCapacity: user.nest.capacity,
        coins: user.balance.coins,
        maxCapacity:
          NEST_UPGRADE_TIERS[
            NEST_UPGRADE_TIERS.length - 1
          ].capacity,
        nextUpgrade: serializeNext(
          user.nest.capacity,
        ),
        tiers: NEST_UPGRADE_TIERS.map((tier) => ({
          capacity: tier.capacity,
          priceCoins: tier.priceCoins,
          reached:
            user.nest!.capacity >= tier.capacity,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/nest-upgrade failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_NEST_UPGRADES",
        message:
          "Не удалось загрузить улучшения гнезда.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const player = await getPlayerContext();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const user = await tx.user.findUnique({
              where: { id: player.userId },
              select: {
                balance: {
                  select: { coins: true },
                },
                nest: {
                  select: { capacity: true },
                },
              },
            });

            if (!user?.balance || !user.nest) {
              throw new Error(
                "PLAYER_STATE_NOT_FOUND",
              );
            }

            const next =
              getNextNestUpgrade(
                user.nest.capacity,
              );

            if (!next) {
              throw new Error(
                "NEST_MAX_LEVEL",
              );
            }

            if (
              user.balance.coins <
              next.priceCoins
            ) {
              throw new Error(
                `INSUFFICIENT_COINS:${next.priceCoins}`,
              );
            }

            const balance =
              await tx.balance.update({
                where: {
                  userId: player.userId,
                },
                data: {
                  coins: {
                    decrement: next.priceCoins,
                  },
                },
                select: {
                  coins: true,
                },
              });

            const nest = await tx.nest.update({
              where: {
                userId: player.userId,
              },
              data: {
                capacity: next.capacity,
              },
              select: {
                capacity: true,
              },
            });

            return {
              paidCoins: next.priceCoins,
              coins: balance.coins,
              capacity: nest.capacity,
              nextUpgrade: serializeNext(
                nest.capacity,
              ),
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel
                .Serializable,
          },
        );

        return NextResponse.json(
          {
            ok: true,
            ...result,
          },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      } catch (error) {
        if (
          getPrismaCode(error) === "P2034" &&
          attempt < 3
        ) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "TRY_AGAIN",
        message:
          "Попробуйте улучшить гнездо ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error(
      "POST /api/nest-upgrade failed:",
      error,
    );

    if (error instanceof Error) {
      if (
        error.message ===
        "PLAYER_STATE_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "PLAYER_STATE_NOT_FOUND",
            message:
              "Данные игрока не найдены.",
          },
          { status: 404 },
        );
      }

      if (error.message === "NEST_MAX_LEVEL") {
        return NextResponse.json(
          {
            ok: false,
            error: "NEST_MAX_LEVEL",
            message:
              "Гнездо уже улучшено до максимума.",
          },
          { status: 409 },
        );
      }

      if (
        error.message.startsWith(
          "INSUFFICIENT_COINS:",
        )
      ) {
        const required = Number(
          error.message.slice(
            "INSUFFICIENT_COINS:".length,
          ),
        );

        return NextResponse.json(
          {
            ok: false,
            error: "INSUFFICIENT_COINS",
            message: `Недостаточно Coins. Нужно ${Number.isFinite(required) ? required : 0} Coins.`,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_UPGRADE_NEST",
        message:
          "Не удалось улучшить гнездо.",
      },
      { status: 500 },
    );
  }
}
