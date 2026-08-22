import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerContext } from "@/lib/player";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFERRER_BONUS_COINS = 500;
const INVITEE_BONUS_COINS = 250;

const BOT_USERNAME = "Dino_FarmBot";

export async function GET() {
  try {
    const player = await getPlayerContext();

    if (!player.authenticated || !player.telegramId) {
      return NextResponse.json({
        ok: true,
        enabled: false,
        reason: "TELEGRAM_REQUIRED",
        invitedCount: 0,
        totalBonusCoins: 0,
        inviterRewardCoins: REFERRER_BONUS_COINS,
        inviteeRewardCoins: INVITEE_BONUS_COINS,
        inviteLink: null,
        recent: [],
      });
    }

    const [invitedCount, referrals] = await Promise.all([
      prisma.referral.count({
        where: { inviterId: player.userId },
      }),
      prisma.referral.findMany({
        where: { inviterId: player.userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          inviterRewardCoins: true,
          createdAt: true,
          invited: {
            select: {
              id: true,
              username: true,
              firstName: true,
            },
          },
        },
      }),
    ]);

    const totalBonusCoins = referrals.reduce(
      (sum, referral) => sum + referral.inviterRewardCoins,
      0,
    );

    return NextResponse.json(
      {
        ok: true,
        enabled: true,
        invitedCount,
        totalBonusCoins,
        inviterRewardCoins: REFERRER_BONUS_COINS,
        inviteeRewardCoins: INVITEE_BONUS_COINS,
        inviteLink: `https://t.me/${BOT_USERNAME}?startapp=ref_${player.telegramId}`,
        recent: referrals.map((referral) => ({
          id: referral.id,
          createdAt: referral.createdAt,
          rewardCoins: referral.inviterRewardCoins,
          friend: {
            id: referral.invited.id,
            username: referral.invited.username,
            firstName: referral.invited.firstName,
          },
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/referrals failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load referrals" },
      { status: 500 },
    );
  }
}
