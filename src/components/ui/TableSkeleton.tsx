export default function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header Skeleton */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse ml-auto"></div>
        </div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-gray-200">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" style={{ animationDelay: `${index * 50}ms` }}></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" style={{ animationDelay: `${index * 50 + 100}ms` }}></div>
              <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" style={{ animationDelay: `${index * 50 + 200}ms` }}></div>
              <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" style={{ animationDelay: `${index * 50 + 300}ms` }}></div>
              <div className="flex gap-2 ml-auto">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" style={{ animationDelay: `${index * 50 + 400}ms` }}></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" style={{ animationDelay: `${index * 50 + 450}ms` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
