import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 250;

const FAILED_STATUSES = [
  "FAILED",
  "EXPIRED",
  "REFUNDED",
  "CREATE_FAILED",
];

const FINAL_STATUSES = [
  "FINISHED",
  ...FAILED_STATUSES,
];

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const number = Number(
    typeof value === "object" &&
      value !== null &&
      "toString" in value
      ? value.toString()
      : value,
  );

  return Number.isFinite(number) ? number : 0;
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_REQUIRED",
          message: "Доступ только для администратора.",
        },
        { status: 401 },
      );
    }

    const url = new URL(request.url);

    const query = (
      url.searchParams.get("q") ?? ""
    )
      .trim()
      .slice(0, 100);

    const requestedFilter =
      (
        url.searchParams.get("filter") ??
        "ALL"
      )
        .trim()
        .toUpperCase();

    const filter = [
      "ALL",
      "FINISHED",
      "PENDING",
      "FAILED",
    ].includes(requestedFilter)
      ? requestedFilter
      : "ALL";

    const and: Prisma.DepositWhereInput[] = [];

    if (query) {
      and.push({
        OR: [
          {
            providerPaymentId: {
              contains: query,
            },
          },
          {
            id: {
              contains: query,
            },
          },
          {
            user: {
              is: {
                telegramId: {
                  contains: query,
                },
              },
            },
          },
          {
            user: {
              is: {
                username: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            user: {
              is: {
                firstName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            user: {
              is: {
                lastName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      });
    }

    if (filter === "FINISHED") {
      and.push({
        status: "FINISHED",
      });
    }

    if (filter === "FAILED") {
      and.push({
        status: {
          in: FAILED_STATUSES,
        },
      });
    }

    if (filter === "PENDING") {
      and.push({
        status: {
          notIn: FINAL_STATUSES,
        },
      });
    }

    const where: Prisma.DepositWhereInput =
      and.length > 0
        ? {
            AND: and,
          }
        : {};

    const [
      deposits,
      totalCount,
      finishedCount,
      failedCount,
      finishedTotals,
      allUsdTotals,
    ] = await Promise.all([
      prisma.deposit.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: LIMIT,
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
      }),

      prisma.deposit.count(),

      prisma.deposit.count({
        where: {
          status: "FINISHED",
        },
      }),

      prisma.deposit.count({
        where: {
          status: {
            in: FAILED_STATUSES,
          },
        },
      }),

      prisma.deposit.aggregate({
        where: {
          status: "FINISHED",
          creditedAt: {
            not: null,
          },
        },
        _sum: {
          usdAmount: true,
          creditedCoins: true,
          bonusCoins: true,
        },
      }),

      prisma.deposit.aggregate({
        _sum: {
          usdAmount: true,
        },
      }),
    ]);

    const pendingCount =
      totalCount -
      finishedCount -
      failedCount;

    return NextResponse.json(
      {
        ok: true,
        filter,
        query,
        limit: LIMIT,
        summary: {
          total: totalCount,
          finished: finishedCount,
          pending: Math.max(
            0,
            pendingCount,
          ),
          failed: failedCount,
          totalUsdCreated:
            decimalToNumber(
              allUsdTotals._sum.usdAmount,
            ),
          paidUsd:
            decimalToNumber(
              finishedTotals._sum.usdAmount,
            ),
          creditedCoins:
            finishedTotals._sum
              .creditedCoins ?? 0,
          bonusCoins:
            finishedTotals._sum
              .bonusCoins ?? 0,
        },
        deposits: deposits.map(
          (deposit) => ({
            id: deposit.id,
            provider:
              deposit.provider,
            providerPaymentId:
              deposit.providerPaymentId,
            methodCode:
              deposit.methodCode,
            payCurrency:
              deposit.payCurrency,
            network:
              deposit.network,
            usdAmount:
              decimalToNumber(
                deposit.usdAmount,
              ),
            baseCoins:
              deposit.baseCoins,
            bonusPercent:
              deposit.bonusPercent,
            bonusCoins:
              deposit.bonusCoins,
            creditedCoins:
              deposit.creditedCoins,
            status:
              deposit.status,
            payAmount:
              deposit.payAmount === null
                ? null
                : decimalToNumber(
                    deposit.payAmount,
                  ),
            actuallyPaid:
              deposit.actuallyPaid ===
              null
                ? null
                : decimalToNumber(
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
            user: deposit.user,
          }),
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
      "GET /api/admin/deposits failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "FAILED_TO_LOAD_ADMIN_DEPOSITS",
        message:
          "Не удалось загрузить криптопополнения.",
      },
      { status: 500 },
    );
  }
}
