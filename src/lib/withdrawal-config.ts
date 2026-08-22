export const withdrawalConfig = {
  currency: "USDT",
  usdtPerDna: 0.0001,
  minDna: 1,
  amountDecimals: 8,
} as const;

export function dnaToUsdt(dnaAmount: number) {
  const raw = dnaAmount * withdrawalConfig.usdtPerDna;
  return Number(raw.toFixed(withdrawalConfig.amountDecimals));
}
