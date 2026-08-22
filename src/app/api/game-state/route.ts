import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_USER_ID = "demo-user-1";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: DEMO_USER_ID,
      },
      include: {
        balance: true,
        nest: true,
        dinosaurs: {
          orderBy: [
            { boardSlot: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Demo user not found" },
        { status: 404 }
      );
    }

    const board: Array<number | null> = Array(16).fill(null);

    for (const dinosaur of user.dinosaurs) {
      const slot = dinosaur.boardSlot;

      if (
        slot !== null &&
        slot >= 0 &&
        slot < 16 &&
        board[slot] === null
      ) {
        board[slot] = dinosaur.level;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },

      balance: {
        coins: user.balance?.coins ?? 0,
        dna: user.balance?.dna ?? 0,
      },

      nest: {
        currentEggs: user.nest?.currentEggs ?? 0,
        capacity: user.nest?.capacity ?? 250000,
        lastProductionAt: user.nest?.lastProductionAt ?? null,
      },

      dinosaurs: user.dinosaurs.map((dinosaur) => ({
        id: dinosaur.id,
        level: dinosaur.level,
        boardSlot: dinosaur.boardSlot,
      })),

      board,
    });
  } catch (error) {
    console.error("GET /api/game-state failed:", error);

    return NextResponse.json(
      { error: "Failed to load game state" },
      { status: 500 }
    );
  }
}
