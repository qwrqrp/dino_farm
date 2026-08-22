export const gameConfig = {
  usdToCoins: 10_000,
  firstDepositBonus: 0.2,
  dnaToCoins: 1.1,
  eggToCoin: 5.28 / 72,
  eggToDna: 5.28 / 72,
  initialNestCapacity: 250_000,
  demoStartingCoins: 50_000,
  demoStartingDna: 100,
} as const;

export const dinosaurs = [
  3, 7, 15, 31, 63, 127, 255, 511,
  1000, 2000, 4000, 8100, 16300, 32700, 65500, 135000,
].map((eggsPerHour, index) => ({
  level: index + 1,
  eggsPerHour,
  buyPrice: 100 * 2 ** index,
}));

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);
}
