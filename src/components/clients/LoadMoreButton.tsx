
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  currentCount: number;
}

export function LoadMoreButton({ 
  onLoadMore, 
  isLoading, 
  hasMore, 
  totalCount, 
  currentCount 
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Showing all {totalCount} clients
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
        className="w-full max-w-xs"
      >
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            Load More Clients
          </>
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Showing {currentCount} of {totalCount} clients
      </p>
    </div>
  );
}
