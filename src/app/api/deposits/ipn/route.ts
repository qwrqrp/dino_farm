import { NextResponse } from "next/server";
import {
  syncDepositFromProvider,
  verifyNowPaymentsIpn,
} from "@/lib/crypto-deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
) {
  try {
    const payload =
      (await request.json()) as unknown;

    const signature =
      request.headers.get(
        "x-nowpayments-sig",
      );

    if (
      !verifyNowPaymentsIpn(
        payload,
        signature,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "INVALID_IPN_SIGNATURE",
        },
        { status: 401 },
      );
    }

    const result =
      await syncDepositFromProvider(
        payload as {
          payment_id?:
            | string
            | number;
          payment_status?: string;
          pay_address?:
            | string
            | null;
          price_amount?:
            | string
            | number;
          price_currency?: string;
          pay_amount?:
            | string
            | number
            | null;
          actually_paid?:
            | string
            | number
            | null;
          pay_currency?: string;
          order_id?:
            | string
            | number;
          purchase_id?:
            | string
            | number
            | null;
        },
      );

    return NextResponse.json({
      ok: true,
      matched: Boolean(result),
      credited:
        result?.credited ?? false,
    });
  } catch (error) {
    console.error(
      "POST /api/deposits/ipn failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_PROCESS_IPN",
      },
      { status: 500 },
    );
  }
}
