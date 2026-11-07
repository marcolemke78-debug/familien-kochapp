// Ladezustand: graue Platzhalter-Karten statt Spinner
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Rezepte werden geladen" className="pt-8 sm:pt-12">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] animate-pulse rounded-[1.25rem] bg-muted" />
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
