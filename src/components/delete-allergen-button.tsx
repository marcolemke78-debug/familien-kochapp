"use client";
// Entfernt eine eigene Allergen-Regel. Ohne Rückfrage: Neu eintragen geht schnell.
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAllergenRule } from "@/app/profil/actions";

export function DeleteAllergenButton({ ruleId, name }: { ruleId: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 rounded-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteAllergenRule(ruleId);
            setError(result.message ?? null);
          })
        }
      >
        <X aria-hidden />
        <span className="sr-only">„{name}“ entfernen</span>
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
