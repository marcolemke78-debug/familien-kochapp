import Link from "next/link";
import { CookingPot, Plus, SearchX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listRecipes } from "@/lib/recipes";
import { hasFilters, parseFilters } from "@/lib/recipe-query";
import { RecipeFilters } from "@/components/recipe-filters";
import { NoAccess } from "@/components/no-access";
import { RecipeCard } from "@/components/recipe-card";
import { familySuitability, type Suitability } from "@/lib/allergens";
import { listAllergenData, listRules } from "@/lib/allergen-store";
import { buttonVariants } from "@/components/ui/button";
import { computeNutrition, isLowCarb } from "@/lib/nutrition";
import { listIngredientsForNutrition, listMappings } from "@/lib/nutrition-store";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const filters = parseFilters(await searchParams);
  const filtered = hasFilters(filters);
  const [all, rules] = await Promise.all([listRecipes(filters), listRules()]);
  // Spec 07: Low Carb wird berechnet, nicht in SQL gefiltert
  let recipes = all;
  if (filters.nutrition.includes("lowcarb")) {
    const [ingredients, mappings] = await Promise.all([listIngredientsForNutrition(), listMappings()]);
    recipes = all.filter((r) => isLowCarb(computeNutrition(ingredients.get(r.id) ?? [], mappings, r.servings)));
  }
  // Spec 06: Badge nur, wenn jemand in der Familie Allergien eingetragen hat
  const suitability = new Map<number, Suitability>();
  if (rules.length > 0) {
    const data = await listAllergenData();
    for (const r of recipes) suitability.set(r.id, familySuitability(data.ingredients.get(r.id) ?? [], rules, data.approved.get(r.id) ?? []));
  }
  // Ganz leeres Kochbuch (nicht nur "kein Treffer") -> Willkommens-Leerzustand ohne Filter
  const empty = !filtered && recipes.length === 0;

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6 sm:pt-12">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Hallo {user.displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Was kochen wir heute?</h1>
        </div>
        {!empty && (
          <Link href="/rezepte/neu" className={buttonVariants({ className: "max-sm:hidden" })}>
            <Plus aria-hidden />
            Neues Rezept
          </Link>
        )}
      </section>

      {!empty && <RecipeFilters filters={filters} />}

      {empty ? (
        <EmptyState />
      ) : recipes.length === 0 ? (
        <NoResults />
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe, index) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} priority={index < 3} suitability={suitability.get(recipe.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NoResults() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-border bg-card px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" aria-hidden />
      </span>
      <div className="max-w-sm space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Nichts gefunden</h2>
        <p className="text-muted-foreground">Zu dieser Auswahl gibt es noch kein Rezept. Probiert weniger Filter.</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Filter zurücksetzen
      </Link>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[1.25rem] border border-border bg-card px-6 py-14 text-center sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <span className="relative flex size-20 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-deep text-primary-foreground shadow-float">
        <CookingPot className="size-9" aria-hidden />
      </span>
      <div className="relative max-w-sm space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Noch keine Rezepte</h2>
        <p className="text-muted-foreground">
          Legt euer erstes Lieblingsrezept an, mit Foto und dem Hinweis, ob es im Thermomix oder in der
          Heißluftfritteuse klappt.
        </p>
      </div>
      <Link href="/rezepte/neu" className={buttonVariants({ size: "lg", className: "relative" })}>
        <Plus aria-hidden />
        Erstes Rezept anlegen
      </Link>
    </section>
  );
}
