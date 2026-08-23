import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminAction = "APPROVE" | "REJECT" | "PAID";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_REQUIRED" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: unknown;
      note?: unknown;
    };

    const action =
      typeof body.action === "string"
        ? body.action.toUpperCase()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 500)
        : "";

    if (
      action !== "APPROVE" &&
      action !== "REJECT" &&
      action !== "PAID"
    ) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ACTION" },
        { status: 400 },
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({
              where: { id },
            });

            if (!withdrawal) {
              throw new Error("WITHDRAWAL_NOT_FOUND");
            }

            const automaticPayoutStarted =
              Boolean(
                withdrawal.payoutLockedAt ||
                  withdrawal.providerBatchId ||
                  withdrawal.providerPayoutId,
              );

            if (automaticPayoutStarted) {
              throw new Error(
                "AUTOMATIC_PAYOUT_IN_PROGRESS",
              );
            }

            if (action === "APPROVE") {
              if (withdrawal.status === "APPROVED") {
                return withdrawal;
              }

              if (withdrawal.status !== "PENDING") {
                throw new Error(
                  `INVALID_STATUS:${withdrawal.status}:APPROVE`,
                );
              }

              return tx.withdrawal.update({
                where: { id },
                data: {
                  status: "APPROVED",
                  note: note || withdrawal.note,
                },
              });
            }

            if (action === "PAID") {
              if (withdrawal.status === "PAID") {
                return withdrawal;
              }

              if (withdrawal.status !== "APPROVED") {
                throw new Error(
                  `INVALID_STATUS:${withdrawal.status}:PAID`,
                );
              }

              return tx.withdrawal.update({
                where: { id },
                data: {
                  status: "PAID",
                  processedAt: new Date(),
                  note: note || withdrawal.note,
                },
              });
            }

            // REJECT: DNA must be returned exactly once.
            if (withdrawal.status === "REJECTED") {
              return withdrawal;
            }

            if (
              withdrawal.status !== "PENDING" &&
              withdrawal.status !== "APPROVED"
            ) {
              throw new Error(
                `INVALID_STATUS:${withdrawal.status}:REJECT`,
              );
            }

            const changed = await tx.withdrawal.updateMany({
              where: {
                id,
                status: {
                  in: ["PENDING", "APPROVED"],
                },
              },
              data: {
                status: "REJECTED",
                processedAt: new Date(),
                note: note || withdrawal.note,
              },
            });

            if (changed.count !== 1) {
              throw new Error("STATUS_CHANGED");
            }

            await tx.balance.update({
              where: { userId: withdrawal.userId },
              data: {
                dna: {
                  increment: withdrawal.dnaAmount,
                },
              },
            });

            const updated = await tx.withdrawal.findUnique({
              where: { id },
            });

            if (!updated) {
              throw new Error("WITHDRAWAL_NOT_FOUND");
            }

            return updated;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return NextResponse.json({
          ok: true,
          withdrawal: {
            id: result.id,
            status: result.status,
            processedAt: result.processedAt?.toISOString() ?? null,
            note: result.note,
          },
        });
      } catch (error) {
        if (getPrismaCode(error) === "P2034" && attempt < 3) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "TRY_AGAIN",
        message: "Повторите действие.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/withdrawals/[id] failed:", error);

    if (error instanceof Error) {
      if (error.message === "WITHDRAWAL_NOT_FOUND") {
        return NextResponse.json(
          { ok: false, error: "WITHDRAWAL_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (
        error.message ===
        "AUTOMATIC_PAYOUT_IN_PROGRESS"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "AUTOMATIC_PAYOUT_IN_PROGRESS",
            message:
              "Эта заявка уже обрабатывается автоматической системой выплат. Ручное изменение статуса заблокировано.",
          },
          { status: 409 },
        );
      }

      if (
        error.message.startsWith("INVALID_STATUS:") ||
        error.message === "STATUS_CHANGED"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_STATUS",
            message:
              "Статус заявки уже изменился. Обновите список и повторите.",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "FAILED_TO_UPDATE_WITHDRAWAL" },
      { status: 500 },
    );
  }
}
