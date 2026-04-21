export default function Loading() {
  return (
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="flex justify-between">
          <div>
            <div className="h-4 w-16 bg-muted rounded mb-2" />
            <div className="h-10 w-40 bg-muted rounded" />
          </div>
          <div>
            <div className="h-10 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-20 bg-muted rounded ml-auto" />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card rounded-xl" />)}
        </div>
        <div className="h-96 bg-card rounded-xl" />
      </div>
    </main>
  );
}
