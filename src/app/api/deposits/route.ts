import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";
import {
  COINS_PER_USD,
  DEPOSIT_MAX_USD,
  DEPOSIT_MIN_USD,
  DEPOSIT_USER_FEE_PERCENT,
  FIRST_DEPOSIT_BONUS_PERCENT,
  coinsForUsd,
  createProviderPayment,
  getDepositMethod,
  getDepositMethodsForUi,
  getMinimumUsdForMethod,
  isNowPaymentsConfigured,
  normalizeUsdAmount,
  serializeDeposit,
} from "@/lib/crypto-deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const player =
      await getPlayerContext();

    const methods =
      await getDepositMethodsForUi();

    if (!player.authenticated) {
      return NextResponse.json(
        {
          ok: true,
          telegramRequired: true,
          providerConfigured:
            isNowPaymentsConfigured(),
          config: {
            minUsd: DEPOSIT_MIN_USD,
            maxUsd: DEPOSIT_MAX_USD,
            coinsPerUsd:
              COINS_PER_USD,
            firstDepositBonusPercent:
              FIRST_DEPOSIT_BONUS_PERCENT,
            userFeePercent:
              DEPOSIT_USER_FEE_PERCENT,
          },
          firstDepositEligible: false,
          methods,
          deposits: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const [
      successfulDeposits,
      deposits,
    ] = await Promise.all([
      prisma.deposit.count({
        where: {
          userId: player.userId,
          creditedAt: {
            not: null,
          },
        },
      }),
      prisma.deposit.findMany({
        where: {
          userId: player.userId,
          status: {
            not: "CREATE_FAILED",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        telegramRequired: false,
        providerConfigured:
          isNowPaymentsConfigured(),
        config: {
          minUsd: DEPOSIT_MIN_USD,
          maxUsd: DEPOSIT_MAX_USD,
          coinsPerUsd:
            COINS_PER_USD,
          firstDepositBonusPercent:
            FIRST_DEPOSIT_BONUS_PERCENT,
          userFeePercent:
            DEPOSIT_USER_FEE_PERCENT,
        },
        firstDepositEligible:
          successfulDeposits === 0,
        methods,
        deposits:
          deposits.map(
            serializeDeposit,
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
      "GET /api/deposits failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_LOAD_DEPOSITS",
        message:
          "Не удалось загрузить пополнения.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  let depositId: string | null = null;

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
            "Пополнение доступно только после входа через Telegram.",
        },
        { status: 401 },
      );
    }

    if (!isNowPaymentsConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message:
            "Криптоплатежи пока не настроены администратором.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      amountUsd?: unknown;
      methodCode?: unknown;
    };

    const amountUsd =
      normalizeUsdAmount(
        body.amountUsd,
      );

    if (amountUsd === null) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "INVALID_DEPOSIT_AMOUNT",
          message:
            `Сумма пополнения должна быть от $${DEPOSIT_MIN_USD} до $${DEPOSIT_MAX_USD}.`,
        },
        { status: 400 },
      );
    }

    const methodCode =
      typeof body.methodCode ===
        "string"
        ? body.methodCode.trim()
        : "";

    const method =
      getDepositMethod(methodCode);

    if (!method) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "INVALID_PAYMENT_METHOD",
          message:
            "Выберите доступную криптовалюту и сеть.",
        },
        { status: 400 },
      );
    }

    const methods =
      await getDepositMethodsForUi();

    const methodForUi =
      methods.find(
        (item) =>
          item.code ===
          method.code,
      );

    if (
      methodForUi &&
      !methodForUi.available
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYMENT_METHOD_UNAVAILABLE",
          message:
            `${method.label} сейчас недоступен у платёжного провайдера.`,
        },
        { status: 409 },
      );
    }

    const providerMinimumUsd =
      await getMinimumUsdForMethod(
        method,
      );

    if (
      providerMinimumUsd !== null &&
      amountUsd < providerMinimumUsd
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MINIMUM_PAYMENT_AMOUNT",
          minimumUsd:
            providerMinimumUsd,
          message:
            `Для ${method.label} сейчас минимальная сумма около $${providerMinimumUsd.toFixed(
              2,
            )}. Увеличьте сумму или выберите другую криптовалюту.`,
        },
        { status: 400 },
      );
    }

    depositId = randomUUID();

    const baseCoins =
      coinsForUsd(amountUsd);

    const deposit =
      await prisma.deposit.create({
        data: {
          id: depositId,
          userId: player.userId,
          provider:
            "NOWPAYMENTS",
          methodCode:
            method.code,
          payCurrency:
            method.providerCurrency,
          network:
            method.network,
          usdAmount:
            amountUsd.toFixed(2),
          baseCoins,
          status: "CREATING",
        },
      });

    const origin =
      new URL(request.url).origin;

    const callbackUrl =
      `${origin}/api/deposits/ipn`;

    const payment =
      await createProviderPayment({
        depositId:
          deposit.id,
        amountUsd,
        method,
        callbackUrl,
      });

    const updated =
      await prisma.deposit.update({
        where: {
          id: deposit.id,
        },
        data: {
          providerPaymentId:
            String(
              payment.payment_id,
            ),
          providerPurchaseId:
            payment.purchase_id ===
              null ||
            payment.purchase_id ===
              undefined
              ? null
              : String(
                  payment.purchase_id,
                ),
          payCurrency:
            String(
              payment.pay_currency ??
                method.providerCurrency,
            ).toLowerCase(),
          status: String(
            payment.payment_status ??
              "WAITING",
          )
            .toUpperCase()
            .replace(
              /[^A-Z0-9_]/g,
              "_",
            ),
          payAmount:
            payment.pay_amount ===
              null ||
            payment.pay_amount ===
              undefined
              ? undefined
              : String(
                  payment.pay_amount,
                ),
          payAddress:
            payment.pay_address ??
            null,
          actuallyPaid:
            payment.actually_paid ===
              null ||
            payment.actually_paid ===
              undefined
              ? undefined
              : String(
                  payment.actually_paid,
                ),
        },
      });

    const successfulBefore =
      await prisma.deposit.count({
        where: {
          userId: player.userId,
          creditedAt: {
            not: null,
          },
        },
      });

    const previewBonusPercent =
      successfulBefore === 0
        ? FIRST_DEPOSIT_BONUS_PERCENT
        : 0;

    return NextResponse.json(
      {
        ok: true,
        firstDepositEligible:
          successfulBefore === 0,
        preview: {
          baseCoins,
          bonusPercent:
            previewBonusPercent,
          bonusCoins:
            Math.round(
              baseCoins *
                (previewBonusPercent /
                  100),
            ),
          totalCoins:
            baseCoins +
            Math.round(
              baseCoins *
                (previewBonusPercent /
                  100),
            ),
        },
        deposit:
          serializeDeposit(
            updated,
          ),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "POST /api/deposits failed:",
      error,
    );

    if (depositId) {
      try {
        await prisma.deposit.update({
          where: {
            id: depositId,
          },
          data: {
            status:
              "CREATE_FAILED",
          },
        });
      } catch {
        // Ignore a secondary status update failure.
      }
    }

    const rawMessage =
      error instanceof Error
        ? error.message
        : "";

    const providerMessage =
      rawMessage.startsWith(
        "NOWPAYMENTS_ERROR:",
      )
        ? rawMessage.slice(
            "NOWPAYMENTS_ERROR:"
              .length,
          )
        : null;

    const isMinimumError =
      Boolean(
        providerMessage &&
          /less than minimal|minimum/i.test(
            providerMessage,
          ),
      );

    return NextResponse.json(
      {
        ok: false,
        error: isMinimumError
          ? "MINIMUM_PAYMENT_AMOUNT"
          : "FAILED_TO_CREATE_DEPOSIT",
        message: isMinimumError
          ? "Сумма ниже текущего минимума платёжной сети. Увеличьте сумму или выберите другую криптовалюту."
          : providerMessage ||
            "Не удалось создать криптоплатёж. Попробуйте ещё раз.",
      },
      {
        status: isMinimumError
          ? 400
          : 500,
      },
    );
  }
}
