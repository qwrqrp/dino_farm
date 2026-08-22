import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "dino_admin";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ADMIN_KEY_HASH = "6bfbd164c5b9941babcd3a5dc6a0209f222749a5429172ae16ea1fe2997bb933";

type AdminSessionPayload = {
  role: "admin";
  exp: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);

  return (
    aBytes.length === bBytes.length &&
    timingSafeEqual(aBytes, bBytes)
  );
}

export function verifyAdminKey(key: string) {
  return safeEqual(sha256(key), ADMIN_KEY_HASH);
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

export function createAdminSessionToken(secret: string) {
  const payload: AdminSessionPayload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string,
  secret: string,
): boolean {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) return false;

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminSessionPayload;

    return (
      payload.role === "admin" &&
      Number.isInteger(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
