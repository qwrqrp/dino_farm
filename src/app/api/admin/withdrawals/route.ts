import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(row: {
  id: string;
  currency: string;
  network: string;
  walletAddress: string;
  dnaAmount: number;
  rateUsdtPerDna: { toString(): string };
  usdtAmount: { toString(): string };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  note: string | null;
  user: {
    id: string;
    telegramId: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return {
    id: row.id,
    currency: row.currency,
    network: row.network,
    walletAddress: row.walletAddress,
    dnaAmount: row.dnaAmount,
    rateUsdtPerDna: Number(row.rateUsdtPerDna.toString()),
    usdtAmount: Number(row.usdtAmount.toString()),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
    note: row.note,
    user: row.user,
  };
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_REQUIRED" },
        { status: 401 },
      );
    }

    const rows = await prisma.withdrawal.findMany({
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      take: 100,
    });

    const withdrawals = rows.map(serialize);

    return NextResponse.json(
      {
        ok: true,
        summary: {
          pending: withdrawals.filter((item) => item.status === "PENDING").length,
          approved: withdrawals.filter((item) => item.status === "APPROVED").length,
          paid: withdrawals.filter((item) => item.status === "PAID").length,
          rejected: withdrawals.filter((item) => item.status === "REJECTED").length,
        },
        withdrawals,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/admin/withdrawals failed:", error);

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_LOAD_WITHDRAWALS" },
      { status: 500 },
    );
  }
}
