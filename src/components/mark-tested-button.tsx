"use client";
// "Als getestet markieren" je Gerät oder für die Kombi (Spec 10): setzt den Status auf "getestet".
import { useState, useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markComboTested, markDeviceTested } from "@/app/rezepte/actions";
import type { Device } from "@/lib/recipe-meta";

export function MarkTestedButton({ recipeId, device }: { recipeId: number; device: Device | "beide" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = device === "beide" ? await markComboTested(recipeId) : await markDeviceTested(recipeId, device);
            setError(result?.message ?? null);
          })
        }
      >
        <BadgeCheck aria-hidden />
        {pending ? "Wird gespeichert …" : "Als getestet markieren"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
