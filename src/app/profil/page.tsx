import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listRules } from "@/lib/allergen-store";
import { NoAccess } from "@/components/no-access";
import { AllergenForm } from "@/components/allergen-form";
import { DeleteAllergenButton } from "@/components/delete-allergen-button";

export const metadata: Metadata = { title: "Mein Profil · Familienkochbuch" };

// Jede Person pflegt hier nur ihr eigenes Allergie-Profil (Login = Person, Spec 06).
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;
  const rules = await listRules(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 pt-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Angemeldet als {user.displayName}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Mein Allergie-Profil</h1>
        <p className="text-muted-foreground">
          Was hier steht, markiert die App in jedem Rezept. Nur du kannst deine Einträge ändern und Ersatz für dich freigeben.
        </p>
      </header>

      {rules.length === 0 ? (
        <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <p className="text-muted-foreground">Noch nichts eingetragen. Dann passt für dich jedes Rezept.</p>
        </section>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 py-2 pr-2 pl-5">
              <div className="min-w-0 flex-1 py-1">
                <p className="font-medium">
                  {rule.name}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {rule.mode === "raw_only" ? "nur roh" : "immer"}
                  </span>
                </p>
                {rule.synonyms.length > 0 && <p className="text-sm text-muted-foreground">auch: {rule.synonyms.join(", ")}</p>}
              </div>
              <DeleteAllergenButton ruleId={rule.id} name={rule.name} />
            </li>
          ))}
        </ul>
      )}

      <AllergenForm />
    </div>
  );
}
