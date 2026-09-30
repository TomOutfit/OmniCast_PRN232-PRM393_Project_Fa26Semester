'use client';

export function ChannelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-dark-800 bg-dark-900/40 p-6 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-dark-700 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-dark-700 rounded w-3/4" />
              <div className="h-3 bg-dark-800 rounded w-1/3" />
              <div className="h-3 bg-dark-800 rounded w-full" />
              <div className="h-3 bg-dark-800 rounded w-5/6" />
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-dark-700">
            <div className="h-3 bg-dark-800 rounded w-16" />
            <div className="h-3 bg-dark-800 rounded w-16" />
            <div className="h-3 bg-dark-800 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
