import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dinosaurs, gameConfig } from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_USER_ID = "demo-user-1";

export async function POST() {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: DEMO_USER_ID },
          include: {
            balance: true,
            nest: true,
            dinosaurs: true,
          },
        });

        if (!user || !user.balance || !user.nest) {
          throw new Error("DEMO_STATE_NOT_FOUND");
        }

        const now = new Date();
        const elapsedSeconds = Math.max(
          0,
          (now.getTime() - user.nest.lastProductionAt.getTime()) / 1000,
        );

        const eggsPerHour = user.dinosaurs.reduce((sum, dinosaur) => {
          const config = dinosaurs[dinosaur.level - 1];
          return sum + (config?.eggsPerHour ?? 0);
        }, 0);

        const producedOffline = eggsPerHour * (elapsedSeconds / 3600);
        const collectibleEggs = Math.min(
          user.nest.capacity,
          user.nest.currentEggs + producedOffline,
        );

        if (collectibleEggs < 1) {
          return {
            collectedEggs: 0,
            coinsReward: 0,
            dnaReward: 0,
            coins: user.balance.coins,
            dna: user.balance.dna,
            currentEggs: user.nest.currentEggs,
            capacity: user.nest.capacity,
            lastProductionAt: user.nest.lastProductionAt,
          };
        }

        const coinsReward = collectibleEggs * gameConfig.eggToCoin;
        const dnaReward = collectibleEggs * gameConfig.eggToDna;

        const [balance, nest] = await Promise.all([
          tx.balance.update({
            where: { userId: DEMO_USER_ID },
            data: {
              coins: { increment: coinsReward },
              dna: { increment: dnaReward },
            },
          }),
          tx.nest.update({
            where: { userId: DEMO_USER_ID },
            data: {
              currentEggs: 0,
              lastProductionAt: now,
            },
          }),
        ]);

        return {
          collectedEggs: collectibleEggs,
          coinsReward,
          dnaReward,
          coins: balance.coins,
          dna: balance.dna,
          currentEggs: nest.currentEggs,
          capacity: nest.capacity,
          lastProductionAt: nest.lastProductionAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.collectedEggs < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_EGGS",
          message: "В гнезде пока нет яиц",
          ...result,
        },
        { status: 400 },
      );
    }

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
    console.error("POST /api/collect-eggs failed:", error);

    if (error instanceof Error && error.message === "DEMO_STATE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Demo user state not found" },
        { status: 404 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Please retry the operation" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to collect eggs" },
      { status: 500 },
    );
  }
}
