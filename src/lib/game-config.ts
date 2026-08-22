export const MAX_DINOSAUR_LEVEL = 16;

export const gameConfig = {
  usdToCoins: 10_000,
  firstDepositBonus: 0.2,

  // Legacy value kept for compatibility with older code.
  // Current game does NOT exchange DNA to Coins in the client.
  dnaToCoins: 1.1,

  eggToCoin: 5.28 / 72,
  eggToDna: 5.28 / 72,

  initialNestCapacity: 250_000,
  demoStartingCoins: 50_000,
  demoStartingDna: 100,
} as const;

/**
 * Single source of truth for dinosaur production.
 * Index 0 = Lv.1, index 15 = Lv.16.
 */
export const DINOSAUR_EGGS_PER_HOUR = [
  3,
  7,
  15,
  31,
  63,
  127,
  255,
  511,
  1_000,
  2_000,
  4_000,
  8_100,
  16_300,
  32_700,
  65_500,
  135_000,
] as const;

export const dinosaurs = DINOSAUR_EGGS_PER_HOUR.map(
  (eggsPerHour, index) => ({
    level: index + 1,
    eggsPerHour,
    // Only Lv.1 is directly purchased now.
    // This is the theoretical equivalent price of the level in Lv.1 copies.
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
