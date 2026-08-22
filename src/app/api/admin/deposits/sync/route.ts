import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";
import {
  getProviderPayment,
  serializeDeposit,
  syncKnownDepositFromProvider,
} from "@/lib/crypto-deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_REQUIRED",
          message:
            "Доступ только для администратора.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      depositId?: unknown;
    };

    const depositId =
      typeof body.depositId === "string"
        ? body.depositId.trim()
        : "";

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
      await prisma.deposit.findUnique({
        where: {
          id: depositId,
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
      return NextResponse.json(
        {
          ok: false,
          error:
            "PROVIDER_PAYMENT_ID_MISSING",
          message:
            "У платежа нет NOWPayments Payment ID.",
        },
        { status: 409 },
      );
    }

    const providerPayment =
      await getProviderPayment(
        deposit.providerPaymentId,
      );

    const providerStatus =
      typeof providerPayment
        .payment_status === "string"
        ? providerPayment.payment_status
        : "unknown";

    const result =
      await syncKnownDepositFromProvider(
        deposit.id,
        providerPayment,
      );

    return NextResponse.json(
      {
        ok: true,
        provider: {
          paymentId:
            providerPayment.payment_id ===
              undefined
              ? null
              : String(
                  providerPayment.payment_id,
                ),
          status: providerStatus,
          payCurrency:
            providerPayment.pay_currency ??
            null,
          payAmount:
            providerPayment.pay_amount ??
            null,
          actuallyPaid:
            providerPayment.actually_paid ??
            null,
          priceAmount:
            providerPayment.price_amount ??
            null,
          priceCurrency:
            providerPayment.price_currency ??
            null,
        },
        credited:
          result.credited,
        balanceCoins:
          result.balanceCoins,
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
      "POST /api/admin/deposits/sync failed:",
      error,
    );

    const code =
      error instanceof Error
        ? error.message
        : "";

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_SYNC_DEPOSIT",
        message:
          code ===
          "DEPOSIT_PAYMENT_ID_MISMATCH"
            ? "NOWPayments вернул другой Payment ID."
            : code ===
                "DEPOSIT_PRICE_MISMATCH"
              ? "Сумма NOWPayments не совпадает с суммой заказа."
              : `Не удалось синхронизировать платёж${
                  code
                    ? `: ${code}`
                    : "."
                }`,
      },
      { status: 500 },
    );
  }
}
