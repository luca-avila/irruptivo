export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeNullableText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = normalizeNullableText(value);

  return normalizedValue || null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertNonEmptyString(value: string, name: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new RangeError(`${name} must be a non-empty string`);
  }

  return trimmedValue;
}
