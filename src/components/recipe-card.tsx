import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { RecipePhoto } from "@/components/recipe-photo";
import { DeviceBadge } from "@/components/device-badge";
import type { RecipeSummary } from "@/lib/recipes";

// Karte in der Rezeptliste: großes Foto zuerst (Kompass: Appetit zuerst), darunter Titel und Eckdaten
export function RecipeCard({ recipe, priority }: { recipe: RecipeSummary; priority?: boolean }) {
  return (
    <Link
      href={`/rezepte/${recipe.id}`}
      className="group flex flex-col gap-3 rounded-[1.25rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <div className="relative overflow-hidden rounded-[1.25rem] shadow-float transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <RecipePhoto
          photoKey={recipe.photoKey}
          alt={recipe.title}
          priority={priority}
          className="aspect-[4/3] w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        {recipe.devices.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {recipe.devices.map((d) => (
              <DeviceBadge key={d.device} device={d.device} status={d.status} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1 px-1">
        <h2 className="line-clamp-2 text-lg leading-snug font-semibold tracking-tight transition-colors duration-150 group-hover:text-primary">
          {recipe.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {recipe.prepMinutes !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatMinutes(recipe.prepMinutes)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden />
            {recipe.servings} {recipe.servings === 1 ? "Portion" : "Portionen"}
          </span>
        </p>
      </div>
    </Link>
  );
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}
