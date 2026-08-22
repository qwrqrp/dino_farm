import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  dinosaurs,
  getDinosaurConfig,
  MAX_DINOSAUR_LEVEL,
} from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_SIZE = 16;

function getErrorCode(error: unknown) {
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

function buildBoard(
  dinos: Array<{
    level: number;
    boardSlot: number | null;
  }>,
) {
  const board: Array<number | null> =
    Array(BOARD_SIZE).fill(null);

  for (const dino of dinos) {
    const slot = dino.boardSlot;

    if (
      slot !== null &&
      slot >= 0 &&
      slot < BOARD_SIZE &&
      board[slot] === null
    ) {
      board[slot] = dino.level;
    }
  }

  return board;
}

function getUnlockedLevel(
  dinos: Array<{ level: number }>,
) {
  return Math.max(
    1,
    ...dinos.map((dino) =>
      Math.max(
        1,
        Math.min(
          MAX_DINOSAUR_LEVEL,
          Math.floor(dino.level),
        ),
      ),
    ),
  );
}

function buildCatalog(unlockedLevel: number) {
  return dinosaurs.map((dino) => ({
    level: dino.level,
    title: `Динозавр Lv.${dino.level}`,
    priceCoins: dino.buyPrice,
    dailyCoins: dino.dailyCoins,
    dailyDna: dino.dailyDna,
    unlocked:
      dino.level === 1 ||
      dino.level <= unlockedLevel,
    unlockRequirement:
      dino.level === 1
        ? null
        : `Сначала получите Lv.${dino.level} через merge`,
  }));
}

export async function GET() {
  try {
    const player = await getPlayerContext();

    const user = await prisma.user.findUnique({
      where: { id: player.userId },
      select: {
        dinosaurs: {
          select: {
            level: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "PLAYER_STATE_NOT_FOUND",
          message: "Данные игрока не найдены.",
        },
        { status: 404 },
      );
    }

    const unlockedLevel = getUnlockedLevel(
      user.dinosaurs,
    );

    return NextResponse.json(
      {
        ok: true,
        unlockedLevel,
        maxLevel: MAX_DINOSAUR_LEVEL,
        catalog: buildCatalog(unlockedLevel),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/buy-dino failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_DINO_SHOP",
        message:
          "Не удалось загрузить магазин динозавров.",
      },
      { status: 500 },
    );
  }
}

async function purchaseDino(
  userId: string,
  requestedLevel: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          balance: true,
          dinosaurs: {
            orderBy: [
              { boardSlot: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      });

      if (!user || !user.balance) {
        throw new Error(
          "PLAYER_STATE_NOT_FOUND",
        );
      }

      const unlockedLevel =
        getUnlockedLevel(user.dinosaurs);

      if (
        requestedLevel > 1 &&
        requestedLevel > unlockedLevel
      ) {
        throw new Error(
          `DINO_LEVEL_LOCKED:${requestedLevel}`,
        );
      }

      const dinoConfig =
        getDinosaurConfig(requestedLevel);

      if (!dinoConfig) {
        throw new Error("INVALID_DINO_LEVEL");
      }

      const price = dinoConfig.buyPrice;

      const occupied = new Set(
        user.dinosaurs
          .map((dino) => dino.boardSlot)
          .filter(
            (slot): slot is number =>
              slot !== null &&
              slot >= 0 &&
              slot < BOARD_SIZE,
          ),
      );

      let emptySlot = -1;

      for (
        let slot = 0;
        slot < BOARD_SIZE;
        slot += 1
      ) {
        if (!occupied.has(slot)) {
          emptySlot = slot;
          break;
        }
      }

      if (emptySlot === -1) {
        throw new Error("BOARD_FULL");
      }

      if (user.balance.coins < price) {
        throw new Error(
          `INSUFFICIENT_COINS:${price}`,
        );
      }

      const balance =
        await tx.balance.update({
          where: { userId },
          data: {
            coins: {
              decrement: price,
            },
          },
          select: {
            coins: true,
          },
        });

      const dinosaur =
        await tx.dinosaur.create({
          data: {
            id: randomUUID(),
            userId,
            level: requestedLevel,
            boardSlot: emptySlot,
          },
        });

      await tx.gameActionLog.create({
        data: {
          id: randomUUID(),
          userId,
          actionType: "PURCHASE_DINO",
          sourceLevel: null,
          resultLevel: requestedLevel,
          coinsSpent: price,
        },
      });

      const dinosaursAfterPurchase = [
        ...user.dinosaurs,
        {
          id: dinosaur.id,
          userId: dinosaur.userId,
          level: dinosaur.level,
          boardSlot: dinosaur.boardSlot,
          createdAt: dinosaur.createdAt,
        },
      ];

      return {
        coins: balance.coins,
        price,
        unlockedLevel,
        dinosaur: {
          id: dinosaur.id,
          level: dinosaur.level,
          boardSlot: dinosaur.boardSlot,
        },
        board: buildBoard(
          dinosaursAfterPurchase,
        ),
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function POST(request: Request) {
  try {
    const player = await getPlayerContext();

    let level = 1;

    try {
      const body = (await request.json()) as {
        level?: unknown;
      };

      if (body.level !== undefined) {
        level = Number(body.level);
      }
    } catch {
      // Compatibility: an empty POST body still buys Lv.1.
      level = 1;
    }

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > MAX_DINOSAUR_LEVEL
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_DINO_LEVEL",
          message:
            "Некорректный уровень динозавра.",
        },
        { status: 400 },
      );
    }

    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      try {
        const result = await purchaseDino(
          player.userId,
          level,
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
          getErrorCode(error) === "P2034" &&
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
        message: "Попробуйте ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error(
      "POST /api/buy-dino failed:",
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

      if (
        error.message ===
        "INVALID_DINO_LEVEL"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_DINO_LEVEL",
            message:
              "Некорректный уровень динозавра.",
          },
          { status: 400 },
        );
      }

      if (
        error.message === "BOARD_FULL"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "BOARD_FULL",
            message:
              "Игровая доска заполнена.",
          },
          { status: 409 },
        );
      }

      if (
        error.message.startsWith(
          "DINO_LEVEL_LOCKED:",
        )
      ) {
        const lockedLevel = Number(
          error.message.slice(
            "DINO_LEVEL_LOCKED:".length,
          ),
        );

        return NextResponse.json(
          {
            ok: false,
            error: "DINO_LEVEL_LOCKED",
            message: `Сначала получите Lv.${Number.isFinite(lockedLevel) ? lockedLevel : "?"} через merge.`,
          },
          { status: 403 },
        );
      }

      if (
        error.message.startsWith(
          "INSUFFICIENT_COINS:",
        )
      ) {
        const price = Number(
          error.message.slice(
            "INSUFFICIENT_COINS:".length,
          ),
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "INSUFFICIENT_COINS",
            message: `Недостаточно Coins. Нужно ${Number.isFinite(price) ? price : 0} Coins.`,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_BUY_DINO",
        message:
          "Не удалось купить динозавра.",
      },
      { status: 500 },
    );
  }
}
