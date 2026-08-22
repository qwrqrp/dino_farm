import { NextResponse } from "next/server";
import {
  getDepositMethod,
  getDepositMethodsForUi,
  getMinimumUsdForMethod,
  isNowPaymentsConfigured,
} from "@/lib/crypto-deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  try {
    if (!isNowPaymentsConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message:
            "Криптоплатежи пока не настроены.",
        },
        { status: 503 },
      );
    }

    const url = new URL(request.url);

    const methodCode =
      url.searchParams
        .get("methodCode")
        ?.trim() ?? "";

    const method =
      getDepositMethod(methodCode);

    if (!method) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "INVALID_PAYMENT_METHOD",
          message:
            "Способ оплаты не найден.",
        },
        { status: 400 },
      );
    }

    const methods =
      await getDepositMethodsForUi();

    const current =
      methods.find(
        (item) =>
          item.code === method.code,
      );

    if (
      current &&
      !current.available
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PAYMENT_METHOD_UNAVAILABLE",
          message:
            `${method.label} сейчас недоступен.`,
        },
        { status: 409 },
      );
    }

    const minimumUsd =
      await getMinimumUsdForMethod(
        method,
      );

    return NextResponse.json(
      {
        ok: true,
        methodCode: method.code,
        label: method.label,
        minimumUsd,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/deposits/minimum failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_LOAD_MINIMUM",
        message:
          "Не удалось получить текущий минимум.",
      },
      { status: 500 },
    );
  }
}
