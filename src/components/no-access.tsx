import { Lock } from "lucide-react";

// Wird gezeigt, wenn kein gültiges Access-Login vorliegt. Enthält bewusst keine Daten.
export function NoAccess() {
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Kein Zugang</h1>
      <p className="text-muted-foreground">
        Dieses Kochbuch ist nur für unsere Familie. Lade die Seite neu und melde dich mit deiner
        E-Mail-Adresse an.
      </p>
    </section>
  );
}
