export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-6 w-14 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonResults() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}
