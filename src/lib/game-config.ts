export const MAX_DINOSAUR_LEVEL = 16;

export const gameConfig = {
  usdToCoins: 10_000,
  firstDepositBonus: 0.2,

  // Legacy value kept for compatibility with older code.
  // Current game does NOT exchange DNA to Coins in the client.
  dnaToCoins: 1.1,

  // 1 collected egg gives both currencies.
  eggToCoin: 0.005,
  eggToDna: 0.005,

  initialNestCapacity: 250_000,
  demoStartingCoins: 50_000,
  demoStartingDna: 100,

  levelOnePriceCoins: 100,
} as const;

/**
 * Exact daily income for ONE dinosaur of each level.
 * Each value is paid in BOTH currencies:
 * Lv.1 = 0.36 Coins/day + 0.36 DNA/day, etc.
 */
export const DINOSAUR_DAILY_INCOME = [
  0.36,
  0.84,
  1.8,
  3.72,
  7.56,
  15.24,
  30.6,
  61.32,
  122.76,
  245.64,
  491.4,
  982.92,
  1965,
  3932,
  7864,
  16200,
] as const;

/**
 * Merge fee is charged in Coins for the RESULTING level.
 *
 * Example:
 * two Lv.1 -> Lv.2 costs 10 Coins
 * two Lv.15 -> Lv.16 costs 100,000 Coins
 *
 * These fees keep the effective Coins-only payback of Lv.2-Lv.16
 * close to ~8 months while keeping early progression affordable.
 */
export const MERGE_FEE_BY_RESULT_LEVEL = [
  0,       // Lv.1: no merge, direct purchase
  10,      // Lv.2
  10,      // Lv.3
  10,      // Lv.4
  50,      // Lv.5
  50,      // Lv.6
  50,      // Lv.7
  50,      // Lv.8
  500,     // Lv.9
  500,     // Lv.10
  500,     // Lv.11
  500,     // Lv.12
  5_000,   // Lv.13
  10_000,  // Lv.14
  25_000,  // Lv.15
  100_000, // Lv.16
] as const;

export function getMergeFeeCoins(resultLevel: number) {
  if (
    !Number.isInteger(resultLevel) ||
    resultLevel < 2 ||
    resultLevel > MAX_DINOSAUR_LEVEL
  ) {
    return 0;
  }

  return MERGE_FEE_BY_RESULT_LEVEL[resultLevel - 1] ?? 0;
}

/**
 * Effective Coins invested to obtain one dinosaur through:
 * Lv.1 purchases + all merge fees on the path.
 *
 * Cost recurrence:
 * C(1) = 100
 * C(L) = 2 * C(L-1) + mergeFee(L)
 */
export const DINOSAUR_EQUIVALENT_COST_COINS = (() => {
  const costs: number[] = [gameConfig.levelOnePriceCoins];

  for (let level = 2; level <= MAX_DINOSAUR_LEVEL; level += 1) {
    const previousCost = costs[level - 2] ?? 0;
    costs.push(previousCost * 2 + getMergeFeeCoins(level));
  }

  return costs;
})();

/**
 * Production in eggs/hour is derived from the exact daily income.
 * Because each egg gives 0.005 Coins and 0.005 DNA:
 * eggs/hour = daily income / 0.005 / 24.
 */
export const dinosaurs = DINOSAUR_DAILY_INCOME.map(
  (dailyIncome, index) => {
    const level = index + 1;
    const equivalentCostCoins =
      DINOSAUR_EQUIVALENT_COST_COINS[index] ??
      gameConfig.levelOnePriceCoins;

    return {
      level,
      dailyCoins: dailyIncome,
      dailyDna: dailyIncome,
      eggsPerHour:
        dailyIncome / gameConfig.eggToCoin / 24,

      // Only Lv.1 is directly purchased now.
      buyPrice:
        level === 1
          ? gameConfig.levelOnePriceCoins
          : equivalentCostCoins,

      levelOneCopies: 2 ** index,
      mergeFeeCoins: getMergeFeeCoins(level),
      equivalentCostCoins,
      paybackDays:
        dailyIncome > 0
          ? equivalentCostCoins / dailyIncome
          : 0,
    };
  },
);

export function getDinosaurConfig(level: number) {
  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > MAX_DINOSAUR_LEVEL
  ) {
    return null;
  }

  return dinosaurs[level - 1] ?? null;
}

export function formatNumber(
  value: number,
  maximumFractionDigits = 2,
) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
  }).format(value);
}
