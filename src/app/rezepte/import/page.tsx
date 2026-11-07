import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/no-access";
import { ImportRecipe } from "@/components/import-recipe";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Rezept übernehmen · Familienkochbuch" };

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return (
    <div className="mx-auto w-full max-w-2xl pt-4 sm:pt-8">
      <Link href="/rezepte/neu" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-3 mb-4" })}>
        <ArrowLeft aria-hidden />
        Selbst eintippen
      </Link>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Rezept aus Foto oder PDF</h1>
      <ImportRecipe />
    </div>
  );
}
