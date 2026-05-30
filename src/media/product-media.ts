import { readFile } from "node:fs/promises";
import path from "node:path";

export const PUBLIC_MEDIA_URL_PREFIX = "/media";
export const PRODUCT_MEDIA_PATH_PREFIX = "products";

const DEFAULT_MEDIA_ROOT = "/var/lib/irruptivo/media";

export type PublicMediaFile = {
  body: ArrayBuffer;
  contentType: string;
  contentLength: number;
};

export function getConfiguredMediaRoot(
  env: Record<string, string | undefined> = process.env
): string {
  return path.resolve(env.IRRUPTIVO_MEDIA_ROOT ?? DEFAULT_MEDIA_ROOT);
}

export function getPublicMediaUrl(relativePath: string): string {
  if (relativePath.startsWith("/")) {
    return relativePath;
  }

  return `${PUBLIC_MEDIA_URL_PREFIX}/${relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function isValidProductMediaPath(relativePath: string): boolean {
  if (
    !relativePath ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\")
  ) {
    return false;
  }

  const segments = relativePath.split("/");

  return (
    segments[0] === PRODUCT_MEDIA_PATH_PREFIX &&
    segments.length >= 4 &&
    segments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== ".."
    )
  );
}

export function resolveProductMediaPath(
  mediaRoot: string,
  relativePath: string
): string | null {
  if (!isValidProductMediaPath(relativePath)) {
    return null;
  }

  const resolvedRoot = path.resolve(mediaRoot);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);

  if (
    resolvedPath !== resolvedRoot &&
    resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return resolvedPath;
  }

  return null;
}

export async function readPublicMediaFile(
  segments: readonly string[],
  mediaRoot: string = getConfiguredMediaRoot()
): Promise<PublicMediaFile | null> {
  const relativePath = segments.join("/");
  const absolutePath = resolveProductMediaPath(mediaRoot, relativePath);

  if (!absolutePath) {
    return null;
  }

  try {
    const body = await readFile(absolutePath);

    return {
      body: body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength
      ) as ArrayBuffer,
      contentType: getImageContentType(relativePath),
      contentLength: body.byteLength
    };
  } catch {
    return null;
  }
}

function getImageContentType(relativePath: string): string {
  switch (path.extname(relativePath).toLowerCase()) {
    case ".avif":
      return "image/avif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
