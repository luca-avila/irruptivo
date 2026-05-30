import { readPublicMediaFile } from "../../../src/media/product-media";

export const runtime = "nodejs";

type MediaRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, context: MediaRouteContext) {
  const params = await context.params;
  const mediaFile = await readPublicMediaFile(params.path);

  if (!mediaFile) {
    return new Response("No encontramos la imagen solicitada.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  return new Response(mediaFile.body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(mediaFile.contentLength),
      "content-type": mediaFile.contentType
    }
  });
}
