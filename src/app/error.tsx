"use client";
// Fehlerzustand für alle Seiten: freundlich, mit Knopf zum erneuten Versuch
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Da ist etwas angebrannt</h1>
      <p className="text-muted-foreground">Die Seite konnte gerade nicht geladen werden. Versuch es bitte noch einmal.</p>
      <Button onClick={reset}>Nochmal versuchen</Button>
    </section>
  );
}
