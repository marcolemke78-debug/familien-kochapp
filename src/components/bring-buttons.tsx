"use client";
// Spec 08: Zutaten in der gewählten Portionenzahl an Bring schicken, oder als Text teilen/kopieren.
import { useState, useTransition } from "react";
import { Check, Share2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBringLink } from "@/app/rezepte/bring-actions";
import { shareText } from "@/lib/bring";
import type { Ingredient } from "@/lib/ingredients";

type Props = { recipeId: number; title: string; ingredients: Ingredient[]; baseServings: number; servings: number };

export function BringButtons({ recipeId, title, ingredients, baseServings, servings }: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toBring() {
    setMessage(null);
    start(async () => {
      const result = await createBringLink(recipeId, servings);
      if (result.ok) window.location.assign(result.url);
      else setMessage(result.error);
    });
  }

  async function share() {
    setMessage(null);
    const text = shareText(title, ingredients, baseServings, servings);
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Liste kopiert.");
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Teilen hat nicht geklappt.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={toBring} disabled={pending} className="h-11">
          <ShoppingCart aria-hidden />
          {pending ? "Öffne Bring …" : "Zu Bring"}
        </Button>
        <Button variant="outline" onClick={share} className="h-11">
          <Share2 aria-hidden />
          Liste teilen
        </Button>
      </div>
      {message && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {message === "Liste kopiert." && <Check className="size-4" aria-hidden />}
          {message}
        </p>
      )}
    </div>
  );
}
