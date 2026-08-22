import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  getProviderPayment,
  serializeDeposit,
  syncDepositFromProvider,
} from "@/lib/crypto-deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  try {
    const player =
      await getPlayerContext();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "TELEGRAM_REQUIRED",
          message:
            "Проверка платежа доступна только через Telegram.",
        },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const depositId =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

    if (!depositId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "DEPOSIT_ID_REQUIRED",
          message:
            "Не указан платёж.",
        },
        { status: 400 },
      );
    }

    const deposit =
      await prisma.deposit.findFirst({
        where: {
          id: depositId,
          userId: player.userId,
        },
      });

    if (!deposit) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "DEPOSIT_NOT_FOUND",
          message:
            "Платёж не найден.",
        },
        { status: 404 },
      );
    }

    if (
      !deposit.providerPaymentId
    ) {
      return NextResponse.json({
        ok: true,
        credited: false,
        balance: null,
        deposit:
          serializeDeposit(
            deposit,
          ),
      });
    }

    const providerPayment =
      await getProviderPayment(
        deposit.providerPaymentId,
      );

    const result =
      await syncDepositFromProvider(
        providerPayment,
      );

    if (
      !result ||
      result.deposit.userId !==
        player.userId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYMENT_SYNC_FAILED",
          message:
            "Не удалось синхронизировать платёж.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        credited:
          result.credited,
        balance: {
          coins:
            result.balanceCoins,
        },
        deposit:
          serializeDeposit(
            result.deposit,
          ),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/deposits/status failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_CHECK_DEPOSIT",
        message:
          "Не удалось проверить платёж. Попробуйте ещё раз через несколько секунд.",
      },
      { status: 500 },
    );
  }
}
