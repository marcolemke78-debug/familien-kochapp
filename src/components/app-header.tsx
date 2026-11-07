import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";

type AppHeaderProps = { userName: string | null };

export function AppHeader({ userName }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2.5 rounded-full pr-3 transition-colors duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-deep text-primary-foreground shadow-float transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-105">
            <ChefHat className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary">
            Familienkochbuch
          </span>
        </Link>

        {userName && (
          <div className="flex items-center gap-2">
            <Link
              href="/rezepte/neu"
              className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-primary to-brand-deep text-primary-foreground shadow-float transition-all duration-150 ease-out outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"
            >
              <Plus className="size-5" aria-hidden />
              <span className="sr-only">Neues Rezept</span>
            </Link>
            <div
              className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground"
              title={`Angemeldet als ${userName}`}
            >
              <span aria-hidden>{userName.charAt(0)}</span>
              <span className="sr-only">Angemeldet als {userName}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
