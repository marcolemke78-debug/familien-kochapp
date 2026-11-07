import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { tagLabel } from "@/lib/recipe-meta";
import { parseRecipeId } from "@/lib/recipe-input";
import { NoAccess } from "@/components/no-access";
import { RecipePhoto } from "@/components/recipe-photo";
import { DeviceBadge } from "@/components/device-badge";
import { ScaledIngredients } from "@/components/scaled-ingredients";
import { MarkTestedButton } from "@/components/mark-tested-button";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { formatMinutes } from "@/components/recipe-card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Rezept · Familienkochbuch" };

export default async function RecipePage({ params }: PageProps<"/rezepte/[id]">) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const id = parseRecipeId((await params).id);
  const recipe = id === null ? null : await getRecipe(id);
  if (!recipe) notFound();

  const hostname = recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, "") : null;

  return (
    <article className="pt-4 sm:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-3",
          })}
        >
          <ArrowLeft aria-hidden />
          Alle Rezepte
        </Link>
        <div className="flex gap-2">
          <Link href={`/rezepte/${recipe.id}/bearbeiten`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil aria-hidden />
            Bearbeiten
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} title={recipe.title} />
        </div>
      </div>

      <RecipePhoto
        photoKey={recipe.photoKey}
        alt={recipe.title}
        priority
        className="aspect-[4/3] w-full rounded-[1.25rem] shadow-float sm:aspect-[16/9] lg:aspect-[21/9]"
      />

      <header className="mt-6 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{recipe.title}</h1>
        {recipe.description && <p className="max-w-2xl text-lg whitespace-pre-line text-muted-foreground">{recipe.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {recipe.prepMinutes !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              <Clock className="size-4" aria-hidden />
              {formatMinutes(recipe.prepMinutes)}
            </span>
          )}
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      </header>

      {recipe.devices.length > 0 && (
        <section aria-label="Geräte" className="mt-6 grid gap-3 sm:grid-cols-2">
          {recipe.devices.map((d) => (
            <div key={d.device} className="flex flex-col gap-3 rounded-[1.25rem] border border-border bg-card p-4">
              <DeviceBadge device={d.device} status={d.status} showStatus className="self-start shadow-none" />
              {d.hint && <p className="text-base">{d.hint}</p>}
              {d.status !== "getestet" && <MarkTestedButton recipeId={recipe.id} device={d.device} />}
            </div>
          ))}
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ScaledIngredients ingredients={recipe.ingredients} baseServings={recipe.servings} />
        </div>

        <section aria-labelledby="zubereitung" className="space-y-5">
          <h2 id="zubereitung" className="text-2xl font-semibold tracking-tight">
            Zubereitung
          </h2>
          <ol className="space-y-6">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-deep text-lg font-semibold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <p className="pt-1.5 text-xl leading-relaxed whitespace-pre-line">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {(recipe.sourceNote || (recipe.sourceUrl && hostname)) && (
        <p className="mt-12 border-t border-border pt-6 text-muted-foreground">
          Quelle: {recipe.sourceNote}
          {recipe.sourceNote && recipe.sourceUrl && hostname && " · "}
          {recipe.sourceUrl && hostname && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-11 items-center gap-1 rounded-md font-medium text-primary underline-offset-4 transition-colors duration-150 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {hostname}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </p>
      )}
    </article>
  );
}
