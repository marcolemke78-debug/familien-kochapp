import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type RecipePhotoProps = {
  photoKey: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

// Rezeptfoto aus der geschützten Route /fotos/… oder ein warmer Platzhalter.
// Bewusst <img> statt next/image: Die Bildoptimierung läuft auf Cloudflare Workers nicht ohne Zusatzdienst,
// und die Fotos sind beim Hochladen schon auf 1600 px verkleinert.
export function RecipePhoto({ photoKey, alt, className, priority }: RecipePhotoProps) {
  if (!photoKey) {
    return (
      <div
        role="img"
        aria-label={`Noch kein Foto: ${alt}`}
        className={cn(
          "flex items-center justify-center bg-linear-to-br from-[#ffe8d6] via-[#ffd9cc] to-[#ffc2c7] text-[#b5475b] dark:from-[#3a2a24] dark:via-[#3d2628] dark:to-[#45232c] dark:text-[#ff9aa9]",
          className,
        )}
      >
        <UtensilsCrossed className="size-1/4 max-h-16 max-w-16 opacity-70" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- siehe Kommentar oben
    <img
      src={`/fotos/${photoKey}`}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("bg-muted object-cover", className)}
    />
  );
}
