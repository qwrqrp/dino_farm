import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  Prisma,
  type Deposit,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramToUser,
} from "@/lib/telegram-notifications";

export const DEPOSIT_MIN_USD = 3;
export const DEPOSIT_MAX_USD = 20_000;
export const COINS_PER_USD = 10_000;
export const FIRST_DEPOSIT_BONUS_PERCENT = 20;

export type DepositMethod = {
  code: string;
  coin: string;
  network: string;
  label: string;
  providerCurrency: string;
};

export const DEPOSIT_METHODS: DepositMethod[] = [
  {
    code: "TRX_TRC20",
    coin: "TRX",
    network: "TRC20",
    label: "TRX — TRC20",
    providerCurrency: "trx",
  },
  {
    code: "BNB_BEP20",
    coin: "BNB",
    network: "BEP20",
    label: "BNB — BEP20",
    providerCurrency: "bnbbsc",
  },
  {
    code: "GRAM_TON",
    coin: "GRAM",
    network: "TON",
    label: "GRAM — TON",
    providerCurrency: "gram",
  },
  {
    code: "TON_TON",
    coin: "TON",
    network: "TON Network",
    label: "TON — TON Network",
    providerCurrency: "ton",
  },
  {
    code: "BTC_BITCOIN",
    coin: "BTC",
    network: "Bitcoin",
    label: "BTC — Bitcoin",
    providerCurrency: "btc",
  },
  {
    code: "USDT_ERC20",
    coin: "USDT",
    network: "ERC20",
    label: "USDT — ERC20",
    providerCurrency: "usdterc20",
  },
  {
    code: "USDT_BEP20",
    coin: "USDT",
    network: "BEP20",
    label: "USDT — BEP20",
    providerCurrency: "usdtbsc",
  },
  {
    code: "USDT_TON",
    coin: "USDT",
    network: "TON",
    label: "USDT — TON",
    providerCurrency: "usdtton",
  },
  {
    code: "USDT_POLYGON",
    coin: "USDT",
    network: "Polygon",
    label: "USDT — Polygon",
    providerCurrency: "usdtmatic",
  },
  {
    code: "USDC_BEP20",
    coin: "USDC",
    network: "BEP20",
    label: "USDC — BEP20",
    providerCurrency: "usdcbsc",
  },
  {
    code: "USDC_POLYGON",
    coin: "USDC",
    network: "Polygon",
    label: "USDC — Polygon",
    providerCurrency: "usdcmatic",
  },
];

type NowPaymentPayload = {
  payment_id?: string | number;
  payment_status?: string;
  pay_address?: string | null;
  price_amount?: string | number;
  price_currency?: string;
  pay_amount?: string | number | null;
  actually_paid?: string | number | null;
  pay_currency?: string;
  order_id?: string | number;
  purchase_id?: string | number | null;
  parent_payment_id?: string | number | null;
  payment_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

let merchantCurrencyCache:
  | {
      expiresAt: number;
      values: Set<string>;
    }
  | null = null;

export function getDepositMethod(
  code: string,
) {
  return DEPOSIT_METHODS.find(
    (method) => method.code === code,
  );
}

export function getNowPaymentsApiBase() {
  const custom =
    process.env.NOWPAYMENTS_API_BASE?.trim();

  if (custom) {
    return custom.replace(/\/+$/, "");
  }

  if (
    process.env.NOWPAYMENTS_USE_SANDBOX ===
    "true"
  ) {
    return "https://api-sandbox.nowpayments.io/v1";
  }

  return "https://api.nowpayments.io/v1";
}

export function isNowPaymentsConfigured() {
  return Boolean(
    process.env.NOWPAYMENTS_API_KEY?.trim(),
  );
}

async function sendDepositTelegramNotification(
  userId: string,
  deposit: {
    usdAmount: Prisma.Decimal;
    creditedCoins: number;
    bonusCoins: number;
    bonusPercent: number;
  },
) {
  const amountUsd =
    Number(deposit.usdAmount);

  const lines = [
    "✅ DINO EGG FARM",
    "",
    "Пополнение успешно зачислено.",
    `Оплачено: $${amountUsd.toFixed(2)}`,
    `Начислено: +${deposit.creditedCoins.toLocaleString(
      "ru-RU",
      {
        maximumFractionDigits: 0,
      },
    )} Coins`,
  ];

  if (deposit.bonusCoins > 0) {
    lines.push(
      `🎁 Бонус: +${deposit.bonusCoins.toLocaleString(
        "ru-RU",
        {
          maximumFractionDigits: 0,
        },
      )} Coins (${deposit.bonusPercent}%)`,
    );
  }

  return sendTelegramToUser(
    userId,
    lines.join("\\n"),
  );
}

async function nowPaymentsFetch(
  path: string,
  init: RequestInit = {},
) {
  const apiKey =
    process.env.NOWPAYMENTS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "NOWPAYMENTS_NOT_CONFIGURED",
    );
  }

  const response = await fetch(
    `${getNowPaymentsApiBase()}${path}`,
    {
      ...init,
      headers: {
        "x-api-key": apiKey,
        ...(init.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  const text = await response.text();

  let data: unknown = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: text,
      };
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message === "string"
        ? (
            data as {
              message: string;
            }
          ).message
        : `NOWPayments HTTP ${response.status}`;

    throw new Error(
      `NOWPAYMENTS_ERROR:${message}`,
    );
  }

  return data;
}

export async function getMerchantCurrencies() {
  if (!isNowPaymentsConfigured()) {
    return null;
  }

  if (
    merchantCurrencyCache &&
    merchantCurrencyCache.expiresAt >
      Date.now()
  ) {
    return merchantCurrencyCache.values;
  }

  try {
    const data = (await nowPaymentsFetch(
      "/merchant/coins",
    )) as {
      selectedCurrencies?: unknown;
      currencies?: unknown;
    };

    const raw =
      Array.isArray(data.selectedCurrencies)
        ? data.selectedCurrencies
        : Array.isArray(data.currencies)
          ? data.currencies
          : [];

    const values = new Set(
      raw
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) =>
          item.trim().toLowerCase(),
        )
        .filter(Boolean),
    );

    merchantCurrencyCache = {
      expiresAt:
        Date.now() + 5 * 60 * 1000,
      values,
    };

    return values;
  } catch (error) {
    console.error(
      "Failed to load NOWPayments merchant currencies:",
      error,
    );

    return null;
  }
}

export async function getDepositMethodsForUi() {
  const configured =
    isNowPaymentsConfigured();

  const merchantCurrencies =
    configured
      ? await getMerchantCurrencies()
      : null;

  return DEPOSIT_METHODS.map((method) => ({
    ...method,
    available:
      configured &&
      (merchantCurrencies === null ||
        merchantCurrencies.size === 0 ||
        merchantCurrencies.has(
          method.providerCurrency.toLowerCase(),
        )),
  }));
}

export function normalizeUsdAmount(
  value: unknown,
) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(
            value
              .trim()
              .replace(",", "."),
          )
        : Number.NaN;

  if (!Number.isFinite(number)) {
    return null;
  }

  const rounded =
    Math.round(number * 100) / 100;

  if (
    rounded < DEPOSIT_MIN_USD ||
    rounded > DEPOSIT_MAX_USD
  ) {
    return null;
  }

  return rounded;
}

export function coinsForUsd(
  amountUsd: number,
) {
  return Math.round(
    amountUsd * COINS_PER_USD,
  );
}

export async function createProviderPayment(input: {
  depositId: string;
  amountUsd: number;
  method: DepositMethod;
  callbackUrl: string;
}) {
  const data = (await nowPaymentsFetch(
    "/payment",
    {
      method: "POST",
      body: JSON.stringify({
        price_amount: input.amountUsd,
        price_currency: "usd",
        pay_currency:
          input.method.providerCurrency,
        ipn_callback_url:
          input.callbackUrl,
        order_id: input.depositId,
        order_description:
          `DINO EGG FARM Coins top up ${input.depositId}`,
      }),
    },
  )) as NowPaymentPayload;

  if (
    data.payment_id === undefined ||
    !data.pay_address ||
    data.pay_amount === undefined ||
    data.pay_amount === null
  ) {
    throw new Error(
      "NOWPAYMENTS_INVALID_RESPONSE",
    );
  }

  return data;
}

export async function getProviderPayment(
  paymentId: string,
) {
  return (await nowPaymentsFetch(
    `/payment/${encodeURIComponent(
      paymentId,
    )}`,
  )) as NowPaymentPayload;
}

async function estimateToUsd(
  amount: number,
  currency: string,
) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !currency
  ) {
    return null;
  }

  const normalized =
    currency.trim().toLowerCase();

  if (
    normalized === "usd" ||
    normalized === "usdt" ||
    normalized.startsWith("usdt") ||
    normalized === "usdc" ||
    normalized.startsWith("usdc")
  ) {
    // Stablecoins can safely be treated approximately as USD for
    // payment-cover validation. The provider still controls the
    // signed payment status and amount.
    return amount;
  }

  try {
    const params =
      new URLSearchParams({
        amount: String(amount),
        currency_from: normalized,
        currency_to: "usd",
      });

    const data =
      (await nowPaymentsFetch(
        `/estimate?${params.toString()}`,
      )) as {
        estimated_amount?: unknown;
      };

    const estimated =
      Number(
        data.estimated_amount,
      );

    return Number.isFinite(
      estimated,
    ) && estimated > 0
      ? estimated
      : null;
  } catch (error) {
    console.error(
      "Failed to estimate wrong-asset payment to USD:",
      error,
    );
    return null;
  }
}

function isAlternateProviderPayment(
  deposit: Deposit,
  payload: NowPaymentPayload,
) {
  const payloadId =
    payload.payment_id ===
      undefined ||
    payload.payment_id === null
      ? ""
      : String(
          payload.payment_id,
        ).trim();

  return Boolean(
    deposit.providerPaymentId &&
      payloadId &&
      deposit.providerPaymentId !==
        payloadId,
  );
}

function alternatePaymentBelongsToDeposit(
  deposit: Deposit,
  payload: NowPaymentPayload,
) {
  const orderId =
    payload.order_id ===
      undefined ||
    payload.order_id === null
      ? ""
      : String(
          payload.order_id,
        ).trim();

  const parentId =
    payload.parent_payment_id ===
      undefined ||
    payload.parent_payment_id === null
      ? ""
      : String(
          payload.parent_payment_id,
        ).trim();

  return Boolean(
    orderId === deposit.id ||
      (
        deposit.providerPaymentId &&
        parentId ===
          deposit.providerPaymentId
      ),
  );
}

async function assertAlternatePaymentCoversOrder(
  deposit: Deposit,
  payload: NowPaymentPayload,
) {
  const paid =
    Number(
      payload.actually_paid ??
        payload.pay_amount,
    );

  const currency =
    typeof payload.pay_currency ===
      "string"
      ? payload.pay_currency
      : "";

  if (
    !Number.isFinite(paid) ||
    paid <= 0 ||
    !currency
  ) {
    throw new Error(
      "WRONG_ASSET_AMOUNT_UNKNOWN",
    );
  }

  const paidUsd =
    await estimateToUsd(
      paid,
      currency,
    );

  if (
    paidUsd === null
  ) {
    throw new Error(
      "WRONG_ASSET_USD_ESTIMATE_FAILED",
    );
  }

  // Allow a small tolerance for provider rate movement.
  // Do not provide Coins for materially underpaid wrong-asset deposits.
  const requiredUsd =
    Number(deposit.usdAmount) *
    0.97;

  if (paidUsd < requiredUsd) {
    throw new Error(
      "WRONG_ASSET_UNDERPAID",
    );
  }
}

export async function getMinimumUsdForMethod(
  method: DepositMethod,
) {
  try {
    // Correct NOWPayments preflight:
    // 1) convert $1 USD into the selected pay currency;
    // 2) ask the minimum with currency_from = selected pay currency.
    //
    // currency_to is omitted by default so NOWPayments uses the
    // merchant account's Primary balance / payout configuration.
    const estimateParams =
      new URLSearchParams({
        amount: "1",
        currency_from: "usd",
        currency_to:
          method.providerCurrency,
      });

    const estimate =
      (await nowPaymentsFetch(
        `/estimate?${estimateParams.toString()}`,
      )) as {
        estimated_amount?: unknown;
      };

    const cryptoPerUsd =
      Number(
        estimate.estimated_amount,
      );

    if (
      !Number.isFinite(cryptoPerUsd) ||
      cryptoPerUsd <= 0
    ) {
      return null;
    }

    const minimumParams =
      new URLSearchParams({
        currency_from:
          method.providerCurrency,
        is_fixed_rate: "False",
        is_fee_paid_by_user: "False",
      });

    const payoutCurrency =
      process.env
        .NOWPAYMENTS_PAYOUT_CURRENCY
        ?.trim()
        .toLowerCase();

    if (payoutCurrency) {
      minimumParams.set(
        "currency_to",
        payoutCurrency,
      );
    }

    const minimum =
      (await nowPaymentsFetch(
        `/min-amount?${minimumParams.toString()}`,
      )) as {
        min_amount?: unknown;
      };

    const minimumCrypto =
      Number(minimum.min_amount);

    if (
      !Number.isFinite(
        minimumCrypto,
      ) ||
      minimumCrypto <= 0
    ) {
      return null;
    }

    const minimumUsd =
      minimumCrypto /
      cryptoPerUsd;

    if (
      !Number.isFinite(minimumUsd) ||
      minimumUsd <= 0
    ) {
      return null;
    }

    // Small 1% safety margin for moving rates / network minimum.
    return (
      Math.ceil(
        minimumUsd * 1.01 * 100,
      ) / 100
    );
  } catch (error) {
    console.error(
      `Failed to load minimum amount for ${method.code}:`,
      error,
    );

    // The provider will still perform the final validation
    // when POST /payment is called.
    return null;
  }
}

function normalizeProviderStatus(
  value: unknown,
) {
  if (typeof value !== "string") {
    return "UNKNOWN";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
}

function decimalString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return String(value);
}

function providerUpdateData(
  payload: NowPaymentPayload,
  options?: {
    preserveOriginalPaymentId?: boolean;
    preserveOriginalPayCurrency?: boolean;
  },
) {
  const update: Prisma.DepositUpdateInput =
    {
      status:
        normalizeProviderStatus(
          payload.payment_status,
        ),
    };

  if (
    payload.payment_id !== undefined &&
    !options?.preserveOriginalPaymentId
  ) {
    update.providerPaymentId =
      String(payload.payment_id);
  }

  if (
    payload.purchase_id !== undefined &&
    payload.purchase_id !== null
  ) {
    update.providerPurchaseId =
      String(payload.purchase_id);
  }

  if (
    typeof payload.pay_address ===
      "string" &&
    payload.pay_address
  ) {
    update.payAddress =
      payload.pay_address;
  }

  if (
    typeof payload.pay_currency ===
      "string" &&
    payload.pay_currency &&
    !options?.preserveOriginalPayCurrency
  ) {
    update.payCurrency =
      payload.pay_currency.toLowerCase();
  }

  const payAmount =
    decimalString(payload.pay_amount);

  if (payAmount !== undefined) {
    update.payAmount = payAmount;
  }

  const actuallyPaid =
    decimalString(payload.actually_paid);

  if (actuallyPaid !== undefined) {
    update.actuallyPaid =
      actuallyPaid;
  }

  return update;
}

function assertProviderMatchesDeposit(
  deposit: Deposit,
  payload: NowPaymentPayload,
) {
  const alternate =
    isAlternateProviderPayment(
      deposit,
      payload,
    );

  if (
    alternate &&
    !alternatePaymentBelongsToDeposit(
      deposit,
      payload,
    )
  ) {
    throw new Error(
      "DEPOSIT_PAYMENT_ID_MISMATCH",
    );
  }

  const providerPrice =
    payload.price_amount === undefined
      ? null
      : Number(
          payload.price_amount,
        );

  if (
    providerPrice !== null &&
    Number.isFinite(providerPrice) &&
    Math.abs(
      providerPrice -
        Number(deposit.usdAmount),
    ) > 0.05
  ) {
    throw new Error(
      "DEPOSIT_PRICE_MISMATCH",
    );
  }

  if (
    payload.price_currency &&
    payload.price_currency
      .trim()
      .toLowerCase() !== "usd"
  ) {
    throw new Error(
      "DEPOSIT_PRICE_CURRENCY_MISMATCH",
    );
  }
}

async function findDepositForProviderPayload(
  payload: NowPaymentPayload,
) {
  const orderId =
    payload.order_id === undefined
      ? ""
      : String(payload.order_id).trim();

  if (orderId) {
    const byOrder =
      await prisma.deposit.findUnique({
        where: {
          id: orderId,
        },
      });

    if (byOrder) {
      return byOrder;
    }
  }

  const paymentId =
    payload.payment_id === undefined
      ? ""
      : String(
          payload.payment_id,
        ).trim();

  if (paymentId) {
    return prisma.deposit.findUnique({
      where: {
        providerPaymentId:
          paymentId,
      },
    });
  }

  return null;
}

async function creditFinishedDeposit(
  depositId: string,
  payload: NowPaymentPayload,
  preserveOriginalPayment = false,
) {
  const MAX_RETRIES = 3;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const result =
        await prisma.$transaction(
        async (tx) => {
          const deposit =
            await tx.deposit.findUnique({
              where: {
                id: depositId,
              },
            });

          if (!deposit) {
            throw new Error(
              "DEPOSIT_NOT_FOUND",
            );
          }

          assertProviderMatchesDeposit(
            deposit,
            payload,
          );

          const update =
            providerUpdateData(
              payload,
              preserveOriginalPayment
                ? {
                    preserveOriginalPaymentId:
                      true,
                    preserveOriginalPayCurrency:
                      true,
                  }
                : undefined,
            );

          if (deposit.creditedAt) {
            const balance =
              await tx.balance.findUnique({
                where: {
                  userId:
                    deposit.userId,
                },
                select: {
                  coins: true,
                },
              });

            const refreshed =
              await tx.deposit.update({
                where: {
                  id: deposit.id,
                },
                data: update,
              });

            return {
              deposit: refreshed,
              credited: false,
              balanceCoins:
                balance?.coins ?? 0,
            };
          }

          const successfulBefore =
            await tx.deposit.count({
              where: {
                userId: deposit.userId,
                creditedAt: {
                  not: null,
                },
                NOT: {
                  id: deposit.id,
                },
              },
            });

          const bonusPercent =
            successfulBefore === 0
              ? FIRST_DEPOSIT_BONUS_PERCENT
              : 0;

          const bonusCoins =
            Math.round(
              deposit.baseCoins *
                (bonusPercent / 100),
            );

          const creditedCoins =
            deposit.baseCoins +
            bonusCoins;

          const balance =
            await tx.balance.upsert({
              where: {
                userId:
                  deposit.userId,
              },
              update: {
                coins: {
                  increment:
                    creditedCoins,
                },
              },
              create: {
                id: randomUUID(),
                userId:
                  deposit.userId,
                coins: creditedCoins,
                dna: 0,
              },
              select: {
                coins: true,
              },
            });

          const refreshed =
            await tx.deposit.update({
              where: {
                id: deposit.id,
              },
              data: {
                ...update,
                status: "FINISHED",
                bonusPercent,
                bonusCoins,
                creditedCoins,
                creditedAt:
                  new Date(),
              },
            });

          return {
            deposit: refreshed,
            credited: true,
            balanceCoins:
              balance.coins,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

      if (result.credited) {
        await sendDepositTelegramNotification(
          result.deposit.userId,
          result.deposit,
        );
      }

      return result;
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code ?? "",
            )
          : "";

      if (
        code === "P2034" &&
        attempt < MAX_RETRIES
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "DEPOSIT_CREDIT_RETRY_EXHAUSTED",
  );
}

export async function syncKnownDepositFromProvider(
  depositId: string,
  payload: NowPaymentPayload,
  options?: {
    allowAlternatePayment?: boolean;
  },
) {
  const deposit =
    await prisma.deposit.findUnique({
      where: {
        id: depositId,
      },
    });

  if (!deposit) {
    throw new Error(
      "DEPOSIT_NOT_FOUND",
    );
  }

  const alternate =
    isAlternateProviderPayment(
      deposit,
      payload,
    );

  if (
    alternate &&
    !options?.allowAlternatePayment
  ) {
    throw new Error(
      "DEPOSIT_PAYMENT_ID_MISMATCH",
    );
  }

  if (
    alternate &&
    !alternatePaymentBelongsToDeposit(
      deposit,
      payload,
    )
  ) {
    throw new Error(
      "DEPOSIT_PAYMENT_ID_MISMATCH",
    );
  }

  const providerPrice =
    payload.price_amount ===
      undefined
      ? null
      : Number(
          payload.price_amount,
        );

  if (
    providerPrice !== null &&
    Number.isFinite(
      providerPrice,
    ) &&
    Math.abs(
      providerPrice -
        Number(deposit.usdAmount),
    ) > 0.05
  ) {
    throw new Error(
      "DEPOSIT_PRICE_MISMATCH",
    );
  }

  const status =
    normalizeProviderStatus(
      payload.payment_status,
    );

  if (
    alternate &&
    status === "FINISHED"
  ) {
    await assertAlternatePaymentCoversOrder(
      deposit,
      payload,
    );
  }

  if (status === "FINISHED") {
    return creditFinishedDepositDirect(
      deposit.id,
      payload,
      alternate,
    );
  }

  const refreshed =
    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data:
        providerUpdateData(
          payload,
          alternate
            ? {
                preserveOriginalPaymentId:
                  true,
                preserveOriginalPayCurrency:
                  true,
              }
            : undefined,
        ),
    });

  const balance =
    await prisma.balance.findUnique({
      where: {
        userId: deposit.userId,
      },
      select: {
        coins: true,
      },
    });

  return {
    deposit: refreshed,
    credited: false,
    balanceCoins:
      balance?.coins ?? 0,
  };
}

async function creditFinishedDepositDirect(
  depositId: string,
  payload: NowPaymentPayload,
  preserveOriginalPayment = false,
) {
  const MAX_RETRIES = 3;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const result =
        await prisma.$transaction(
        async (tx) => {
          const deposit =
            await tx.deposit.findUnique({
              where: {
                id: depositId,
              },
            });

          if (!deposit) {
            throw new Error(
              "DEPOSIT_NOT_FOUND",
            );
          }

          const alternate =
            isAlternateProviderPayment(
              deposit,
              payload,
            );

          if (
            alternate &&
            !alternatePaymentBelongsToDeposit(
              deposit,
              payload,
            )
          ) {
            throw new Error(
              "DEPOSIT_PAYMENT_ID_MISMATCH",
            );
          }

          const update =
            providerUpdateData(
              payload,
              preserveOriginalPayment
                ? {
                    preserveOriginalPaymentId:
                      true,
                    preserveOriginalPayCurrency:
                      true,
                  }
                : undefined,
            );

          // Idempotency: if this exact deposit was already credited,
          // never increment Coins again.
          if (deposit.creditedAt) {
            const balance =
              await tx.balance.findUnique({
                where: {
                  userId:
                    deposit.userId,
                },
                select: {
                  coins: true,
                },
              });

            const refreshed =
              await tx.deposit.update({
                where: {
                  id: deposit.id,
                },
                data: {
                  ...update,
                  status: "FINISHED",
                },
              });

            return {
              deposit: refreshed,
              credited: false,
              balanceCoins:
                balance?.coins ?? 0,
            };
          }

          // First-deposit bonus is determined only by prior deposits
          // that were actually credited.
          const successfulBefore =
            await tx.deposit.count({
              where: {
                userId:
                  deposit.userId,
                creditedAt: {
                  not: null,
                },
                NOT: {
                  id: deposit.id,
                },
              },
            });

          const bonusPercent =
            successfulBefore === 0
              ? FIRST_DEPOSIT_BONUS_PERCENT
              : 0;

          const bonusCoins =
            Math.round(
              deposit.baseCoins *
                (bonusPercent / 100),
            );

          const creditedCoins =
            deposit.baseCoins +
            bonusCoins;

          const balance =
            await tx.balance.upsert({
              where: {
                userId:
                  deposit.userId,
              },
              update: {
                coins: {
                  increment:
                    creditedCoins,
                },
              },
              create: {
                id: randomUUID(),
                userId:
                  deposit.userId,
                coins:
                  creditedCoins,
                dna: 0,
              },
              select: {
                coins: true,
              },
            });

          const refreshed =
            await tx.deposit.update({
              where: {
                id: deposit.id,
              },
              data: {
                ...update,
                status: "FINISHED",
                bonusPercent,
                bonusCoins,
                creditedCoins,
                creditedAt:
                  new Date(),
              },
            });

          return {
            deposit: refreshed,
            credited: true,
            balanceCoins:
              balance.coins,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

      if (result.credited) {
        await sendDepositTelegramNotification(
          result.deposit.userId,
          result.deposit,
        );
      }

      return result;
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code ?? "",
            )
          : "";

      if (
        code === "P2034" &&
        attempt < MAX_RETRIES
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "DEPOSIT_CREDIT_RETRY_EXHAUSTED",
  );
}

export async function syncDepositFromProvider(
  payload: NowPaymentPayload,
) {
  const deposit =
    await findDepositForProviderPayload(
      payload,
    );

  if (!deposit) {
    return null;
  }

  assertProviderMatchesDeposit(
    deposit,
    payload,
  );

  const alternate =
    isAlternateProviderPayment(
      deposit,
      payload,
    );

  const status =
    normalizeProviderStatus(
      payload.payment_status,
    );

  if (
    alternate &&
    status === "FINISHED"
  ) {
    await assertAlternatePaymentCoversOrder(
      deposit,
      payload,
    );
  }

  if (status === "FINISHED") {
    return creditFinishedDeposit(
      deposit.id,
      payload,
      alternate,
    );
  }

  const refreshed =
    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data:
        providerUpdateData(
          payload,
          alternate
            ? {
                preserveOriginalPaymentId:
                  true,
                preserveOriginalPayCurrency:
                  true,
              }
            : undefined,
        ),
    });

  const balance =
    await prisma.balance.findUnique({
      where: {
        userId: deposit.userId,
      },
      select: {
        coins: true,
      },
    });

  return {
    deposit: refreshed,
    credited: false,
    balanceCoins:
      balance?.coins ?? 0,
  };
}


function sortObjectDeep(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const source = value as Record<
      string,
      unknown
    >;

    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>(
        (result, key) => {
          result[key] =
            sortObjectDeep(source[key]);
          return result;
        },
        {},
      );
  }

  return value;
}

export function verifyNowPaymentsIpn(
  payload: unknown,
  receivedSignature: string | null,
) {
  const secret =
    process.env.NOWPAYMENTS_IPN_SECRET?.trim();

  if (
    !secret ||
    !receivedSignature
  ) {
    return false;
  }

  const sorted = JSON.stringify(
    sortObjectDeep(payload),
  );

  const expected = createHmac(
    "sha512",
    secret,
  )
    .update(sorted)
    .digest("hex");

  const received =
    receivedSignature
      .trim()
      .toLowerCase();

  if (
    expected.length !==
      received.length ||
    !/^[0-9a-f]+$/i.test(received)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}

export function serializeDeposit(
  deposit: Deposit,
) {
  return {
    id: deposit.id,
    provider: deposit.provider,
    providerPaymentId:
      deposit.providerPaymentId,
    methodCode:
      deposit.methodCode,
    payCurrency:
      deposit.payCurrency,
    network: deposit.network,
    usdAmount:
      Number(deposit.usdAmount),
    baseCoins: deposit.baseCoins,
    bonusPercent:
      deposit.bonusPercent,
    bonusCoins:
      deposit.bonusCoins,
    creditedCoins:
      deposit.creditedCoins,
    status: deposit.status,
    payAmount:
      deposit.payAmount === null
        ? null
        : Number(deposit.payAmount),
    actuallyPaid:
      deposit.actuallyPaid === null
        ? null
        : Number(
            deposit.actuallyPaid,
          ),
    payAddress:
      deposit.payAddress,
    createdAt:
      deposit.createdAt.toISOString(),
    updatedAt:
      deposit.updatedAt.toISOString(),
    creditedAt:
      deposit.creditedAt?.toISOString() ??
      null,
  };
}
