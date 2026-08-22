import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_SIZE = 16;

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
          message: "Некорректные клетки доски.",
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
        const result = await prisma.$transaction(
          async (tx) => {
            const dinosaurs =
              await tx.dinosaur.findMany({
                where: {
                  userId: player.userId,
                },
                orderBy: [
                  { boardSlot: "asc" },
                  { createdAt: "asc" },
                ],
              });

            const source = dinosaurs.find(
              (dino) =>
                dino.boardSlot === fromSlot,
            );

            if (!source) {
              throw new Error(
                "SOURCE_DINO_NOT_FOUND",
              );
            }

            const target = dinosaurs.find(
              (dino) =>
                dino.boardSlot === toSlot,
            );

            if (target) {
              throw new Error(
                "TARGET_SLOT_OCCUPIED",
              );
            }

            const moved =
              await tx.dinosaur.update({
                where: { id: source.id },
                data: {
                  boardSlot: toSlot,
                },
                select: {
                  id: true,
                  level: true,
                  boardSlot: true,
                },
              });

            const board = buildBoard(
              dinosaurs.map((dino) =>
                dino.id === source.id
                  ? {
                      ...dino,
                      boardSlot: toSlot,
                    }
                  : dino,
              ),
            );

            return {
              moved,
              board,
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
          "Попробуйте переместить динозавра ещё раз.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error(
      "POST /api/move-dino failed:",
      error,
    );

    if (error instanceof Error) {
      if (
        error.message ===
        "SOURCE_DINO_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "SOURCE_DINO_NOT_FOUND",
            message:
              "Динозавр в исходной клетке не найден.",
          },
          { status: 404 },
        );
      }

      if (
        error.message ===
        "TARGET_SLOT_OCCUPIED"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "TARGET_SLOT_OCCUPIED",
            message:
              "Эта клетка уже занята.",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_MOVE_DINO",
        message:
          "Не удалось переместить динозавра.",
      },
      { status: 500 },
    );
  }
}
