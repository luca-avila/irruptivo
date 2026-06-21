export function isPrismaKnownError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaKnownError(error, "P2002");
}

export function isRecordNotFoundError(error: unknown): boolean {
  return isPrismaKnownError(error, "P2025");
}
