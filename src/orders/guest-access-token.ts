import { randomBytes } from "node:crypto";

export function createGuestOrderAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
