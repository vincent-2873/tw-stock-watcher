export default function Loading() {
  return (
    <main className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="flex gap-2 overflow-hidden">
          {[...Array(8)].map((_, i) => <div key={i} className="flex-shrink-0 w-36 h-20 bg-card rounded-lg" />)}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-card rounded-lg" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2 p-4 bg-card rounded-xl">
              <div className="h-5 w-32 bg-muted rounded" />
              {[...Array(10)].map((_, j) => <div key={j} className="h-10 bg-muted/50 rounded" />)}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
