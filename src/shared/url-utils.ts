export function normalizeAbsoluteUrlOrigin(
  value: string | null | undefined,
  options: { allowVercelHostWithoutProtocol?: boolean } = {}
): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const urlValue =
    options.allowVercelHostWithoutProtocol &&
    trimmedValue.endsWith(".vercel.app") &&
    !trimmedValue.includes("://")
      ? `https://${trimmedValue}`
      : trimmedValue;

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeAbsoluteUrlHref(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
