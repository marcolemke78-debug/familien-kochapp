// Ladezustand der Rezeptseite: Platzhalter in der Form der echten Seite (Foto, Titel, Zutaten, Zubereitung)
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Rezept wird geladen" className="pt-4 sm:pt-8">
      <div className="mb-4 h-11 w-36 animate-pulse rounded-xl bg-muted" />
      <div className="aspect-[4/3] w-full animate-pulse rounded-[1.25rem] bg-muted sm:aspect-[16/9] lg:aspect-[21/9]" />
      <div className="mt-6 space-y-4">
        <div className="h-9 w-3/4 animate-pulse rounded-xl bg-muted sm:w-1/2" />
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
        <div className="space-y-3">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-[1.25rem] bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
