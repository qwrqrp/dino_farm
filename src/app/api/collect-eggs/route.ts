import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import { gameConfig, getDinosaurConfig } from "@/lib/game-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "collect-eggs",
    method: "POST",
  });
}

export async function POST() {
  try {
    const player = await getPlayerContext();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: player.userId },
        include: {
          balance: true,
          nest: true,
          dinosaurs: true,
        },
      });

      if (!user || !user.balance || !user.nest) {
        throw new Error("PLAYER_STATE_NOT_FOUND");
      }

      const now = new Date();
      const elapsedSeconds = Math.max(
        0,
        (now.getTime() - user.nest.lastProductionAt.getTime()) / 1000,
      );

      const eggsPerHour = user.dinosaurs.reduce((sum, dinosaur) => {
        const config = getDinosaurConfig(dinosaur.level);
        return sum + (config?.eggsPerHour ?? 0);
      }, 0);

      const producedSinceLastUpdate = eggsPerHour * (elapsedSeconds / 3600);
      const collectibleEggs = Math.min(
        user.nest.capacity,
        user.nest.currentEggs + producedSinceLastUpdate,
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
        };
      }

      const coinsReward = collectibleEggs * gameConfig.eggToCoin;
      const dnaReward = collectibleEggs * gameConfig.eggToDna;

      const balance = await tx.balance.update({
        where: { userId: player.userId },
        data: {
          coins: { increment: coinsReward },
          dna: { increment: dnaReward },
        },
      });

      const nest = await tx.nest.update({
        where: { userId: player.userId },
        data: {
          currentEggs: 0,
          lastProductionAt: now,
        },
      });

      await tx.gameStats.upsert({
        where: { userId: player.userId },
        update: {
          totalEggsCollected: {
            increment: collectibleEggs,
          },
        },
        create: {
          id: randomUUID(),
          userId: player.userId,
          totalEggsCollected: collectibleEggs,
        },
      });

      return {
        collectedEggs: collectibleEggs,
        coinsReward,
        dnaReward,
        coins: balance.coins,
        dna: balance.dna,
        currentEggs: nest.currentEggs,
        capacity: nest.capacity,
      };
    });

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
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("POST /api/collect-eggs failed:", error);

    if (error instanceof Error && error.message === "PLAYER_STATE_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "Player state not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to collect eggs" },
      { status: 500 },
    );
  }
}
