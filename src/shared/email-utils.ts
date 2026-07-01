import { z } from "zod";

const emailSchema = z.email();

// Single source of truth for "is this a valid email" so every boundary
// (checkout contact form, admin notification settings) agrees on the same
// format rules instead of each rolling its own regex.
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}
