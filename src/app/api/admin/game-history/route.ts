import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 300;

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
    const requestedType =
      url.searchParams.get("type")?.trim() ?? "ALL";

    const allowedTypes = new Set([
      "ALL",
      "PURCHASE_DINO",
      "MERGE_DINO",
    ]);

    const type = allowedTypes.has(requestedType)
      ? requestedType
      : "ALL";

    const where =
      type === "ALL"
        ? {}
        : {
            actionType: type,
          };

    const [actions, total, purchaseCount, mergeCount] =
      await Promise.all([
        prisma.gameActionLog.findMany({
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
        prisma.gameActionLog.count(),
        prisma.gameActionLog.count({
          where: {
            actionType: "PURCHASE_DINO",
          },
        }),
        prisma.gameActionLog.count({
          where: {
            actionType: "MERGE_DINO",
          },
        }),
      ]);

    return NextResponse.json(
      {
        ok: true,
        filter: type,
        limit: LIMIT,
        summary: {
          total,
          purchases: purchaseCount,
          merges: mergeCount,
        },
        actions: actions.map((action) => ({
          id: action.id,
          actionType: action.actionType,
          sourceLevel: action.sourceLevel,
          resultLevel: action.resultLevel,
          coinsSpent: action.coinsSpent,
          createdAt: action.createdAt.toISOString(),
          user: action.user,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/admin/game-history failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "FAILED_TO_LOAD_GAME_HISTORY",
        message: "Не удалось загрузить историю игры.",
      },
      { status: 500 },
    );
  }
}
