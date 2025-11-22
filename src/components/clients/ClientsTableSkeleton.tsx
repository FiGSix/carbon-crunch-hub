import { Skeleton } from '@/components/ui/skeleton';

interface ClientsTableSkeletonProps {
  rows?: number;
  isAdmin?: boolean;
}

export function ClientsTableSkeleton({ rows = 5, isAdmin = false }: ClientsTableSkeletonProps) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto lg:overflow-visible">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Client Name</th>
              <th className="text-left p-4 font-semibold text-sm">Company</th>
              {isAdmin && <th className="text-left p-4 font-semibold text-sm">Agent</th>}
              <th className="text-center p-4 font-semibold text-sm">Projects</th>
              <th className="text-right p-4 font-semibold text-sm">Total MWp</th>
              <th className="text-center p-4 font-semibold text-sm">Status</th>
              <th className="text-center p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="border-b">
                {/* Client Name */}
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </td>

                {/* Company */}
                <td className="p-4">
                  <Skeleton className="h-4 w-24" />
                </td>

                {/* Agent (Admin only) */}
                {isAdmin && (
                  <td className="p-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                )}

                {/* Projects */}
                <td className="p-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-8" />
                  </div>
                </td>

                {/* Total MWp */}
                <td className="p-4">
                  <div className="flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </td>

                {/* Status */}
                <td className="p-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer skeleton */}
      <div className="border-t p-4 flex items-center justify-between bg-muted/20">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
