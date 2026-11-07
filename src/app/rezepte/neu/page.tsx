import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ScanText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/no-access";
import { RecipeForm } from "@/components/recipe-form";

export const metadata: Metadata = { title: "Neues Rezept · Familienkochbuch" };

export default async function NewRecipePage() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return (
    <div className="mx-auto w-full max-w-2xl pt-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Neues Rezept</h1>
      <Link
        href="/rezepte/import"
        className="mb-8 flex min-h-11 items-center gap-4 rounded-[1.25rem] border border-border bg-linear-to-br from-primary/10 to-card p-4 shadow-float transition-all duration-200 ease-out outline-none hover:-translate-y-0.5 hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-brand-deep text-primary-foreground">
          <ScanText className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Aus Foto oder PDF übernehmen</span>
          <span className="block text-sm text-muted-foreground">Claude liest das Rezept und füllt alles vor.</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <RecipeForm
        values={{
          id: null,
          // Einmal-Kennung pro Formular: doppeltes Absenden legt kein zweites Rezept an
          clientId: crypto.randomUUID(),
          title: "",
          description: "",
          servings: 4,
          prepMinutes: null,
          sourceUrl: "",
          sourceNote: "",
          tags: [],
          devices: [],
          ingredients: [],
          steps: [],
          photoKey: null,
        }}
      />
    </div>
  );
}
