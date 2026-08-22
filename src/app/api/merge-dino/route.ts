import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_SIZE = 16;
const MAX_DINO_LEVEL = 16;

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function buildBoard(dinos: Array<{ level: number; boardSlot: number | null }>) {
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
    route: "merge-dino",
    method: "POST",
    body: { fromSlot: 0, toSlot: 1 },
  });
}

async function mergeDino(userId: string, fromSlot: number, toSlot: number) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          dinosaurs: {
            orderBy: [{ boardSlot: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!user) {
        throw new Error("PLAYER_STATE_NOT_FOUND");
      }

      const source = user.dinosaurs.find((dino) => dino.boardSlot === fromSlot);
      const target = user.dinosaurs.find((dino) => dino.boardSlot === toSlot);

      if (!source || !target) {
        throw new Error("DINO_NOT_FOUND");
      }

      if (source.id === target.id) {
        throw new Error("SAME_DINO");
      }

      if (source.level !== target.level) {
        throw new Error("LEVEL_MISMATCH");
      }

      if (source.level >= MAX_DINO_LEVEL) {
        throw new Error("MAX_LEVEL");
      }

      const newLevel = target.level + 1;

      await tx.dinosaur.delete({
        where: { id: source.id },
      });

      const upgraded = await tx.dinosaur.update({
        where: { id: target.id },
        data: { level: newLevel },
      });

      const dinosaursAfterMerge = user.dinosaurs
        .filter((dino) => dino.id !== source.id && dino.id !== target.id)
        .concat({
          id: upgraded.id,
          userId: upgraded.userId,
          level: upgraded.level,
          boardSlot: upgraded.boardSlot,
          createdAt: upgraded.createdAt,
        });

      return {
        merged: {
          id: upgraded.id,
          level: upgraded.level,
          boardSlot: upgraded.boardSlot,
        },
        removedDinosaurId: source.id,
        board: buildBoard(dinosaursAfterMerge),
      };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function POST(request: Request) {
  try {
    const player = await getPlayerContext();
    const body = (await request.json()) as {
      fromSlot?: unknown;
      toSlot?: unknown;
    };

    const fromSlot = Number(body.fromSlot);
    const toSlot = Number(body.toSlot);

    if (
      !Number.isInteger(fromSlot) ||
      !Number.isInteger(toSlot) ||
      fromSlot < 0 ||
      fromSlot >= BOARD_SIZE ||
      toSlot < 0 ||
      toSlot >= BOARD_SIZE ||
      fromSlot === toSlot
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_SLOTS",
          message: "Некорректные клетки для merge",
        },
        { status: 400 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await mergeDino(player.userId, fromSlot, toSlot);
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
      { ok: false, error: "TRY_AGAIN", message: "Попробуйте merge ещё раз" },
      { status: 409 },
    );
  } catch (error) {
    console.error("POST /api/merge-dino failed:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON", message: "Некорректный запрос" },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      const messages: Record<string, { status: number; message: string }> = {
        PLAYER_STATE_NOT_FOUND: { status: 404, message: "Состояние игрока не найдено" },
        DINO_NOT_FOUND: { status: 404, message: "Динозавр в выбранной клетке не найден" },
        SAME_DINO: { status: 400, message: "Нужно выбрать двух разных динозавров" },
        LEVEL_MISMATCH: { status: 400, message: "Для merge нужны два одинаковых уровня" },
        MAX_LEVEL: { status: 400, message: "Достигнут максимальный уровень 16" },
      };

      const mapped = messages[error.message];
      if (mapped) {
        return NextResponse.json(
          { ok: false, error: error.message, message: mapped.message },
          { status: mapped.status },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to merge dinosaur" },
      { status: 500 },
    );
  }
}
