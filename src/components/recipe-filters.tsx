// Filterleiste über der Rezeptliste. Server Component: Chips sind Links, die Suche ist ein GET-Formular.
// Dadurch steht alles in der URL und es braucht kein eigenes JavaScript.
import Link from "next/link";
import Form from "next/form";
import { Search, X } from "lucide-react";
import { DEVICES, MEALS, TRAITS } from "@/lib/recipe-meta";
import { filterHref, hasFilters, type Filters } from "@/lib/recipe-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChipDef = { key: "meals" | "traits" | "devices"; value: string; label: string };

const CHIPS: ChipDef[] = [
  ...MEALS.map((m) => ({ key: "meals" as const, value: m.value, label: m.label })),
  ...TRAITS.map((t) => ({ key: "traits" as const, value: t.value, label: t.label })),
  ...DEVICES.map((d) => ({ key: "devices" as const, value: d.value, label: d.short })),
];

export function RecipeFilters({ filters }: { filters: Filters }) {
  const activeCount = filters.meals.length + filters.traits.length + filters.devices.length;
  return (
    <div className="mb-8 space-y-3">
      <Form action="/" role="search" className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="q" className="sr-only">
          Rezept oder Zutat suchen
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={filters.q}
          maxLength={100}
          placeholder="Rezept oder Zutat suchen"
          className="rounded-full pl-12"
        />
        {/* Gewählte Chips beim Suchen mitnehmen */}
        {filters.meals.length > 0 && <input type="hidden" name="mahlzeit" value={filters.meals.join(",")} />}
        {filters.traits.length > 0 && <input type="hidden" name="merkmal" value={filters.traits.join(",")} />}
        {filters.devices.length > 0 && <input type="hidden" name="geraet" value={filters.devices.join(",")} />}
      </Form>

      {/* Auf dem Handy seitlich wischbar, ab sm umbrechend */}
      <nav aria-label="Filter" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 py-1 sm:w-auto sm:flex-wrap">
          {/* Zuerst: Zurücksetzen mit Anzahl, damit man auf dem Handy sieht, dass Filter aktiv sind */}
          {hasFilters(filters) && (
            <li>
              <Link
                href="/"
                scroll={false}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-base font-medium whitespace-nowrap border border-primary/40 text-primary transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden />
                {activeCount === 0 ? "Suche" : `${activeCount} Filter`} löschen
              </Link>
            </li>
          )}
          {CHIPS.map((chip) => {
            const active = (filters[chip.key] as string[]).includes(chip.value);
            return (
              <li key={`${chip.key}-${chip.value}`}>
                <Link
                  href={filterHref(filters, chip.key, chip.value)}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-base font-medium whitespace-nowrap transition-all duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                    active
                      ? "border-transparent bg-linear-to-r from-primary to-brand-deep text-primary-foreground hover:brightness-110"
                      : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  {chip.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
