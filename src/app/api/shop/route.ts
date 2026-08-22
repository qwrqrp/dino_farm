import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.shopItem.findMany({
      where: {
        active: true,
        kind: "DINO",
      },
      orderBy: [{ sortOrder: "asc" }, { priceCoins: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        priceCoins: true,
        kind: true,
        amount: true,
      },
    });

    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/shop failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load shop" },
      { status: 500 },
    );
  }
}
