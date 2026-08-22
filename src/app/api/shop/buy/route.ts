import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_SIZE = 16;

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function buildBoard(
  dinos: Array<{ level: number; boardSlot: number | null }>,
) {
  const board: Array<number | null> = Array(BOARD_SIZE).fill(null);

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

async function buyItem(userId: string, itemCode: string) {
  return prisma.$transaction(
    async (tx) => {
      const item = await tx.shopItem.findUnique({
        where: { code: itemCode },
      });

      if (!item || !item.active) {
        throw new Error("ITEM_NOT_FOUND");
      }

      // DNA is a value-bearing currency. It is earned in-game and may be
      // withdrawn/converted to money through a separate server-side flow,
      // so it must never be purchasable in the shop.
      if (item.kind === "DNA") {
        throw new Error("DNA_NOT_FOR_SALE");
      }

      if (item.kind === "NEST_CAPACITY") {
        throw new Error("NEST_UPGRADE_ONLY");
      }

      if (item.kind !== "DINO") {
        throw new Error("UNSUPPORTED_ITEM_KIND");
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          balance: true,
          nest: true,
          dinosaurs: {
            orderBy: [{ boardSlot: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!user || !user.balance || !user.nest) {
        throw new Error("PLAYER_STATE_NOT_FOUND");
      }

      if (user.balance.coins < item.priceCoins) {
        throw new Error("INSUFFICIENT_COINS");
      }

      let dinosaursAfter = user.dinosaurs;

      if (item.kind === "DINO") {
        const occupied = new Set(
          user.dinosaurs
            .map((dino) => dino.boardSlot)
            .filter(
              (slot): slot is number =>
                slot !== null && slot >= 0 && slot < BOARD_SIZE,
            ),
        );

        let emptySlot = -1;
        for (let slot = 0; slot < BOARD_SIZE; slot += 1) {
          if (!occupied.has(slot)) {
            emptySlot = slot;
            break;
          }
        }

        if (emptySlot === -1) {
          throw new Error("BOARD_FULL");
        }

        const level = Math.max(1, Math.min(16, Math.floor(item.amount)));
        const created = await tx.dinosaur.create({
          data: {
            id: randomUUID(),
            userId,
            level,
            boardSlot: emptySlot,
          },
        });

        dinosaursAfter = [
          ...user.dinosaurs,
          {
            id: created.id,
            userId: created.userId,
            level: created.level,
            boardSlot: created.boardSlot,
            createdAt: created.createdAt,
          },
        ];
      } else {
        throw new Error("UNSUPPORTED_ITEM_KIND");
      }

      await tx.balance.update({
        where: { userId },
        data: {
          coins: { decrement: item.priceCoins },
        },
      });

      await tx.shopPurchase.create({
        data: {
          id: randomUUID(),
          userId,
          shopItemId: item.id,
          priceCoins: item.priceCoins,
        },
      });

      const updated = await tx.user.findUnique({
        where: { id: userId },
        include: {
          balance: true,
          nest: true,
          dinosaurs: {
            orderBy: [{ boardSlot: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!updated || !updated.balance || !updated.nest) {
        throw new Error("PLAYER_STATE_NOT_FOUND");
      }

      return {
        item: {
          code: item.code,
          title: item.title,
          kind: item.kind,
          amount: item.amount,
          priceCoins: item.priceCoins,
        },
        balance: {
          coins: updated.balance.coins,
          dna: updated.balance.dna,
        },
        nest: {
          capacity: updated.nest.capacity,
        },
        board: buildBoard(updated.dinosaurs),
      };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function POST(request: Request) {
  try {
    const player = await getPlayerContext();
    const body = (await request.json()) as { itemCode?: unknown };
    const itemCode = typeof body.itemCode === "string" ? body.itemCode.trim() : "";

    if (!itemCode) {
      return NextResponse.json(
        { ok: false, error: "ITEM_CODE_REQUIRED" },
        { status: 400 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await buyItem(player.userId, itemCode);

        return NextResponse.json(
          { ok: true, ...result },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        if (getErrorCode(error) === "P2034" && attempt < 3) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      { ok: false, error: "TRY_AGAIN", message: "Попробуйте ещё раз" },
      { status: 409 },
    );
  } catch (error) {
    console.error("POST /api/shop/buy failed:", error);

    if (error instanceof Error) {
      const statusByMessage: Record<string, number> = {
        ITEM_NOT_FOUND: 404,
        PLAYER_STATE_NOT_FOUND: 404,
        INSUFFICIENT_COINS: 400,
        BOARD_FULL: 409,
        DNA_NOT_FOR_SALE: 400,
        NEST_UPGRADE_ONLY: 400,
        UNSUPPORTED_ITEM_KIND: 400,
      };

      const messages: Record<string, string> = {
        ITEM_NOT_FOUND: "Товар не найден",
        PLAYER_STATE_NOT_FOUND: "Данные игрока не найдены",
        INSUFFICIENT_COINS: "Недостаточно Coins",
        BOARD_FULL: "Игровая доска заполнена",
        DNA_NOT_FOR_SALE: "DNA нельзя покупать. Эта валюта зарабатывается в игре и предназначена для вывода в деньги.",
        NEST_UPGRADE_ONLY: "Вместимость гнезда теперь улучшается только через экран «Гнездо».",
        UNSUPPORTED_ITEM_KIND: "Этот товар пока не поддерживается",
      };

      if (statusByMessage[error.message]) {
        return NextResponse.json(
          {
            ok: false,
            error: error.message,
            message: messages[error.message],
          },
          { status: statusByMessage[error.message] },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to buy shop item" },
      { status: 500 },
    );
  }
}
