"use client";
// Löschen nur nach Bestätigung im eigenen Dialog (kein confirm()). Das Foto wird mitgelöscht.
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteRecipe } from "@/app/rezepte/actions";

export function DeleteRecipeButton({ recipeId, title }: { recipeId: number; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2 aria-hidden />
        Löschen
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rezept löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            „{title}“ wird mit Foto für die ganze Familie gelöscht. Das lässt sich nicht rückgängig machen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Behalten</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                // Bei Erfolg leitet die Action zur Startseite weiter; zurück kommt nur eine Fehlermeldung
                const result = await deleteRecipe(recipeId);
                setError(result?.message ?? null);
              })
            }
          >
            {pending ? "Wird gelöscht …" : "Endgültig löschen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
