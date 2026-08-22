import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import { dinosaurs } from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_SIZE = 16;
const DINO_LEVEL = 1;
const DINO_PRICE = dinosaurs[DINO_LEVEL - 1].buyPrice;

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

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "buy-dino",
    method: "POST",
    level: DINO_LEVEL,
    price: DINO_PRICE,
  });
}

async function purchaseDino(userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          balance: true,
          dinosaurs: {
            orderBy: [{ boardSlot: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!user || !user.balance) {
        throw new Error("PLAYER_STATE_NOT_FOUND");
      }

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

      if (user.balance.coins < DINO_PRICE) {
        throw new Error("INSUFFICIENT_COINS");
      }

      const balance = await tx.balance.update({
        where: { userId },
        data: {
          coins: { decrement: DINO_PRICE },
        },
      });

      const dinosaur = await tx.dinosaur.create({
        data: {
          id: randomUUID(),
          userId,
          level: DINO_LEVEL,
          boardSlot: emptySlot,
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
        price: DINO_PRICE,
        dinosaur: {
          id: dinosaur.id,
          level: dinosaur.level,
          boardSlot: dinosaur.boardSlot,
        },
        board: buildBoard(dinosaursAfterPurchase),
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function POST() {
  try {
    const player = await getPlayerContext();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await purchaseDino(player.userId);

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
    console.error("POST /api/buy-dino failed:", error);

    if (error instanceof Error) {
      if (error.message === "PLAYER_STATE_NOT_FOUND") {
        return NextResponse.json(
          { ok: false, error: "Player state not found" },
          { status: 404 },
        );
      }

      if (error.message === "BOARD_FULL") {
        return NextResponse.json(
          {
            ok: false,
            error: "BOARD_FULL",
            message: "Игровая доска заполнена",
          },
          { status: 409 },
        );
      }

      if (error.message === "INSUFFICIENT_COINS") {
        return NextResponse.json(
          {
            ok: false,
            error: "INSUFFICIENT_COINS",
            message: "Недостаточно Coins",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to buy dinosaur" },
      { status: 500 },
    );
  }
}
