export const MAX_DINOSAUR_LEVEL = 16;

export const gameConfig = {
  usdToCoins: 10_000,
  firstDepositBonus: 0.2,

  // Legacy value kept for compatibility with older code.
  // Current game does NOT exchange DNA to Coins in the client.
  dnaToCoins: 1.1,

  // Economy rule:
  // 1 collected egg = 0.005 Coins + 0.005 DNA.
  eggToCoin: 0.005,
  eggToDna: 0.005,

  initialNestCapacity: 250_000,
  demoStartingCoins: 50_000,
  demoStartingDna: 100,
} as const;

/**
 * Exact user-defined daily income for ONE dinosaur of each level.
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
 * Production in eggs/hour is derived from the exact daily income.
 * Because each egg gives 0.005 Coins and 0.005 DNA:
 * eggs/hour = daily income / 0.005 / 24.
 */
export const dinosaurs = DINOSAUR_DAILY_INCOME.map(
  (dailyIncome, index) => ({
    level: index + 1,
    dailyCoins: dailyIncome,
    dailyDna: dailyIncome,
    eggsPerHour:
      dailyIncome / gameConfig.eggToCoin / 24,

    // Only Lv.1 is directly purchased now.
    // This is the theoretical number of Lv.1 dinosaurs needed through merges.
    buyPrice: 100 * 2 ** index,
    levelOneCopies: 2 ** index,
  }),
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
