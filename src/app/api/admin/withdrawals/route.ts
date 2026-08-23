import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberFromDecimal(
  value: { toString(): string } | null,
) {
  return value === null
    ? null
    : Number(value.toString());
}

function iso(
  value: Date | null,
) {
  return value?.toISOString() ?? null;
}

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

  payoutExternalId: string | null;
  providerBatchId: string | null;
  providerPayoutId: string | null;
  providerPayoutStatus: string | null;
  payoutCurrency: string | null;
  payoutFee: { toString(): string } | null;
  payoutLockedAt: Date | null;
  payoutCreatedAt: Date | null;
  payoutVerifiedAt: Date | null;
  payoutCompletedAt: Date | null;
  payoutLastCheckedAt: Date | null;
  payoutFailureCode: string | null;
  payoutFailureMessage: string | null;

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
    rateUsdtPerDna:
      Number(
        row.rateUsdtPerDna.toString(),
      ),
    usdtAmount:
      Number(
        row.usdtAmount.toString(),
      ),
    status: row.status,
    createdAt:
      row.createdAt.toISOString(),
    updatedAt:
      row.updatedAt.toISOString(),
    processedAt:
      iso(row.processedAt),
    note: row.note,

    payoutExternalId:
      row.payoutExternalId,
    providerBatchId:
      row.providerBatchId,
    providerPayoutId:
      row.providerPayoutId,
    providerPayoutStatus:
      row.providerPayoutStatus,
    payoutCurrency:
      row.payoutCurrency,
    payoutFee:
      numberFromDecimal(
        row.payoutFee,
      ),
    payoutLockedAt:
      iso(row.payoutLockedAt),
    payoutCreatedAt:
      iso(row.payoutCreatedAt),
    payoutVerifiedAt:
      iso(row.payoutVerifiedAt),
    payoutCompletedAt:
      iso(row.payoutCompletedAt),
    payoutLastCheckedAt:
      iso(row.payoutLastCheckedAt),
    payoutFailureCode:
      row.payoutFailureCode,
    payoutFailureMessage:
      row.payoutFailureMessage,

    user: row.user,
  };
}

export async function GET() {
  try {
    if (
      !(await isAdminAuthenticated())
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_REQUIRED",
        },
        { status: 401 },
      );
    }

    const rows =
      await prisma.withdrawal.findMany({
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

    const withdrawals =
      rows.map(serialize);

    return NextResponse.json(
      {
        ok: true,
        summary: {
          pending:
            withdrawals.filter(
              (item) =>
                item.status ===
                "PENDING",
            ).length,
          approved:
            withdrawals.filter(
              (item) =>
                item.status ===
                "APPROVED",
            ).length,
          paid:
            withdrawals.filter(
              (item) =>
                item.status ===
                "PAID",
            ).length,
          rejected:
            withdrawals.filter(
              (item) =>
                item.status ===
                "REJECTED",
            ).length,

          automaticProcessing:
            withdrawals.filter(
              (item) =>
                item.status ===
                  "APPROVED" &&
                Boolean(
                  item.providerPayoutId ||
                    item.providerBatchId ||
                    item.payoutLockedAt,
                ),
            ).length,

          providerErrors:
            withdrawals.filter(
              (item) =>
                Boolean(
                  item.payoutFailureCode ||
                    item.payoutFailureMessage,
                ),
            ).length,
        },
        withdrawals,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/admin/withdrawals failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_LOAD_WITHDRAWALS",
      },
      { status: 500 },
    );
  }
}
