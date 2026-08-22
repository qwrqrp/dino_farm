import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type ValidatedTelegramInitData = {
  user: TelegramWebAppUser;
  authDate: number;
  startParam?: string;
};

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");

  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400,
): ValidatedTelegramInitData {
  if (!initData || !botToken) {
    throw new Error("Telegram initData or bot token is missing");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw new Error("Telegram hash is missing");
  }

  // Telegram's bot-token validation excludes only `hash`.
  // Any other field received from Telegram remains part of the signed payload.
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeHexEqual(receivedHash, calculatedHash)) {
    throw new Error("Invalid Telegram initData signature");
  }

  const authDateRaw = params.get("auth_date");
  const authDate = Number(authDateRaw);

  if (!Number.isInteger(authDate) || authDate <= 0) {
    throw new Error("Invalid Telegram auth_date");
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;

  if (age < -30 || age > maxAgeSeconds) {
    throw new Error("Telegram initData is expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("Telegram user is missing");
  }

  let user: TelegramWebAppUser;

  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new Error("Telegram user JSON is invalid");
  }

  if (!Number.isSafeInteger(user.id) || user.id <= 0 || !user.first_name) {
    throw new Error("Telegram user data is invalid");
  }

  return {
    user,
    authDate,
    startParam: params.get("start_param") ?? undefined,
  };
}
