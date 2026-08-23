export const withdrawalConfig = {
  currency: "USDT",
  usdtPerDna: 0.0001,
  minDna: 200_000,
  minUsdt: 20,
  amountDecimals: 8,
  networkFeePaidBy: "PROJECT",
} as const;

export function dnaToUsdt(dnaAmount: number) {
  const raw =
    dnaAmount *
    withdrawalConfig.usdtPerDna;

  return Number(
    raw.toFixed(
      withdrawalConfig.amountDecimals,
    ),
  );
}
