import React, { useEffect } from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GlobalLoadingDemo() {
  const { setGlobalLoading, startOperation, endOperation } = useLoading();

  // Simulate some background operations on mount to show loading indicators
  useEffect(() => {
    const timer = setTimeout(() => {
      startOperation('demo-data-load');
      setTimeout(() => endOperation('demo-data-load'), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [startOperation, endOperation]);

  const handleGlobalLoad = () => {
    setGlobalLoading(true);
    setTimeout(() => setGlobalLoading(false), 3000);
  };

  const handleOperationLoad = () => {
    startOperation('user-operation');
    setTimeout(() => endOperation('user-operation'), 2500);
  };

  return (
    <Card className="loading-demo-card">
      <CardHeader>
        <CardTitle>Loading State Demo</CardTitle>
        <CardDescription>
          Test different loading indicators to ensure they're properly detected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGlobalLoad} className="w-full">
          Trigger Global Loading
        </Button>
        <Button onClick={handleOperationLoad} variant="outline" className="w-full">
          Trigger Operation Loading
        </Button>
        <div className="loading-indicator animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mx-auto"></div>
      </CardContent>
    </Card>
  );
}