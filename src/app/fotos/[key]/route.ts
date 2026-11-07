// Liefert ein Rezeptfoto aus R2 – nur an angemeldete Familienmitglieder.
import { getCurrentUser } from "@/lib/auth";
import { getPhoto, isPhotoKey } from "@/lib/photos";

export async function GET(request: Request, ctx: RouteContext<"/fotos/[key]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Kein Zugang", { status: 401 });

  const { key } = await ctx.params;
  if (!isPhotoKey(key)) return new Response("Nicht gefunden", { status: 404 });

  // Fotos ändern sich nie (neues Foto = neuer Name), darum darf der Browser sie lange behalten
  const object = await getPhoto(key);
  if (!object) return new Response("Nicht gefunden", { status: 404 });

  if (request.headers.get("if-none-match") === object.httpEtag) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=31536000, immutable"); // private: nicht in fremden Caches
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
