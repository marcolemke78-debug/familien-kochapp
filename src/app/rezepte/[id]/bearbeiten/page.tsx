import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { formatIngredient } from "@/lib/ingredients";
import { parseRecipeId } from "@/lib/recipe-input";
import { NoAccess } from "@/components/no-access";
import { RecipeForm } from "@/components/recipe-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Rezept bearbeiten · Familienkochbuch" };

export default async function EditRecipePage({ params }: PageProps<"/rezepte/[id]/bearbeiten">) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const id = parseRecipeId((await params).id);
  const recipe = id === null ? null : await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl pt-4 sm:pt-8">
      <Link href={`/rezepte/${recipe.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-3 mb-4" })}>
        <ArrowLeft aria-hidden />
        Zurück zum Rezept
      </Link>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Rezept bearbeiten</h1>
      <RecipeForm
        values={{
          id: recipe.id,
          clientId: recipe.clientId,
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          sourceUrl: recipe.sourceUrl ?? "",
          sourceNote: recipe.sourceNote ?? "",
          tags: recipe.tags,
          devices: recipe.devices,
          ingredients: recipe.ingredients.map(formatIngredient),
          steps: recipe.steps,
          photoKey: recipe.photoKey,
        }}
      />
    </div>
  );
}
