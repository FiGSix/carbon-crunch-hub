
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProposalSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Client Information Section */}
          <div>
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-40" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Project Information Section */}
          <div>
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-40" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Carbon Credit Section */}
          <div>
            <Skeleton className="h-6 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {[1, 2].map(i => (
                <div key={i}>
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
            <Skeleton className="h-6 w-64 mb-2" />
            <div className="h-48 w-full">
              <Skeleton className="h-full w-full rounded-md" />
            </div>
          </div>
          
          {/* Revenue Distribution Section */}
          <div>
            <Skeleton className="h-6 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-lg border">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
