"use client";
// "Haben wir getestet" je Gerät: setzt den Status auf "getestet"
import { useState, useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markDeviceTested } from "@/app/rezepte/actions";
import { deviceShort, type Device } from "@/lib/recipe-meta";

export function MarkTestedButton({ recipeId, device }: { recipeId: number; device: Device }) {
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
            const result = await markDeviceTested(recipeId, device);
            setError(result?.message ?? null);
          })
        }
      >
        <BadgeCheck aria-hidden />
        {pending ? "Wird gespeichert …" : `Haben wir im ${deviceShort(device)} getestet`}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
