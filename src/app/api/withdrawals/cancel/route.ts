import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  formatTelegramDna,
  formatTelegramUsdt,
  sendTelegramToUser,
} from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPrismaCode(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  const code = (
    error as {
      code?: unknown;
    }
  ).code;

  return typeof code === "string"
    ? code
    : null;
}

export async function POST(
  request: Request,
) {
  try {
    const player =
      await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_REQUIRED",
          message:
            "Отмена вывода доступна только через Telegram.",
        },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as {
        withdrawalId?: unknown;
      };

    const withdrawalId =
      typeof body.withdrawalId ===
        "string"
        ? body.withdrawalId.trim()
        : "";

    if (!withdrawalId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "WITHDRAWAL_ID_REQUIRED",
          message:
            "Не указана заявка.",
        },
        { status: 400 },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const withdrawal =
            await tx.withdrawal.findUnique(
              {
                where: {
                  id: withdrawalId,
                },
              },
            );

          if (
            !withdrawal ||
            withdrawal.userId !==
              player.userId
          ) {
            throw new Error(
              "WITHDRAWAL_NOT_FOUND",
            );
          }

          if (
            withdrawal.status ===
              "REJECTED" &&
            withdrawal.note ===
              "CANCELED_BY_PLAYER"
          ) {
            const balance =
              await tx.balance.findUnique(
                {
                  where: {
                    userId:
                      player.userId,
                  },
                  select: {
                    dna: true,
                  },
                },
              );

            return {
              withdrawal,
              balanceDna:
                balance?.dna ?? 0,
              alreadyCanceled:
                true,
            };
          }

          if (
            withdrawal.status !==
            "PENDING"
          ) {
            throw new Error(
              `CANNOT_CANCEL:${withdrawal.status}`,
            );
          }

          if (
            withdrawal.payoutLockedAt ||
            withdrawal.providerBatchId ||
            withdrawal.providerPayoutId
          ) {
            throw new Error(
              "PAYOUT_ALREADY_STARTED",
            );
          }

          const changed =
            await tx.withdrawal.updateMany(
              {
                where: {
                  id: withdrawal.id,
                  userId:
                    player.userId,
                  status: "PENDING",
                },
                data: {
                  status:
                    "REJECTED",
                  processedAt:
                    new Date(),
                  note:
                    "CANCELED_BY_PLAYER",
                },
              },
            );

          if (changed.count !== 1) {
            throw new Error(
              "STATUS_CHANGED",
            );
          }

          const balance =
            await tx.balance.update({
              where: {
                userId:
                  player.userId,
              },
              data: {
                dna: {
                  increment:
                    withdrawal.dnaAmount,
                },
              },
              select: {
                dna: true,
              },
            });

          const updated =
            await tx.withdrawal.findUnique(
              {
                where: {
                  id: withdrawal.id,
                },
              },
            );

          if (!updated) {
            throw new Error(
              "WITHDRAWAL_NOT_FOUND",
            );
          }

          return {
            withdrawal: updated,
            balanceDna:
              balance.dna,
            alreadyCanceled: false,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    if (!result.alreadyCanceled) {
      await sendTelegramToUser(
        player.userId,
        [
          "↩️ DINO EGG FARM",
          "",
          "Заявка на вывод отменена.",
          `Возвращено: ${formatTelegramDna(
            result.withdrawal.dnaAmount,
          )} DNA`,
          `Отменённая выплата: ${formatTelegramUsdt(
            Number(
              result.withdrawal.usdtAmount.toString(),
            ),
          )} USDT`,
          "",
          "DNA уже возвращена на игровой баланс.",
          "USDT по этой заявке не отправлялись.",
        ].join("\n"),
      );
    }

    return NextResponse.json(
      {
        ok: true,
        alreadyCanceled:
          result.alreadyCanceled,
        balance: {
          dna: result.balanceDna,
        },
        withdrawal: {
          id:
            result.withdrawal.id,
          currency:
            result.withdrawal
              .currency,
          network:
            result.withdrawal
              .network,
          walletAddress:
            result.withdrawal
              .walletAddress,
          dnaAmount:
            result.withdrawal
              .dnaAmount,
          rateUsdtPerDna:
            Number(
              result.withdrawal
                .rateUsdtPerDna
                .toString(),
            ),
          usdtAmount:
            Number(
              result.withdrawal
                .usdtAmount
                .toString(),
            ),
          status:
            result.withdrawal
              .status,
          createdAt:
            result.withdrawal
              .createdAt
              .toISOString(),
          updatedAt:
            result.withdrawal
              .updatedAt
              .toISOString(),
          note:
            result.withdrawal.note,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "POST /api/withdrawals/cancel failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "WITHDRAWAL_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "WITHDRAWAL_NOT_FOUND",
          message:
            "Заявка не найдена.",
        },
        { status: 404 },
      );
    }

    if (
      message ===
      "PAYOUT_ALREADY_STARTED"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYOUT_ALREADY_STARTED",
          message:
            "Выплата уже передана в обработку. Отменить эту заявку больше нельзя.",
        },
        { status: 409 },
      );
    }

    if (
      message.startsWith(
        "CANNOT_CANCEL:",
      )
    ) {
      const status =
        message.split(":")[1] ??
        "";

      return NextResponse.json(
        {
          ok: false,
          error:
            "WITHDRAWAL_ALREADY_PROCESSING",
          message:
            status === "APPROVED"
              ? "Заявка уже одобрена и не может быть отменена."
              : status === "PAID"
                ? "Выплата уже отмечена как отправленная."
                : "Эту заявку уже нельзя отменить.",
        },
        { status: 409 },
      );
    }

    if (
      message ===
        "STATUS_CHANGED" ||
      getPrismaCode(error) ===
        "P2034"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "WITHDRAWAL_STATUS_CHANGED",
          message:
            "Статус заявки уже изменился. Обновите историю.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_CANCEL_WITHDRAWAL",
        message:
          "Не удалось отменить заявку.",
      },
      { status: 500 },
    );
  }
}
