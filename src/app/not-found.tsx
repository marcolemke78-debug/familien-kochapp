import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Rezept nicht gefunden</h1>
      <p className="text-muted-foreground">Vielleicht wurde es gelöscht oder der Link stimmt nicht.</p>
      <Link href="/" className={buttonVariants()}>
        Zu allen Rezepten
      </Link>
    </section>
  );
}
