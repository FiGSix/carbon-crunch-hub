

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, RefreshCw, WifiOff, Shield } from 'lucide-react';

interface ClientsTableErrorProps {
  error: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function ClientsTableError({ error, isRefreshing = false, onRefresh }: ClientsTableErrorProps) {
  
  
  // Determine error type and appropriate icon/message
  const getErrorInfo = (errorMsg: string) => {
    if (errorMsg.includes('authentication') || errorMsg.includes('unauthorized')) {
      return {
        icon: Shield,
        title: 'Authentication Required',
        description: 'Please sign in again to access your clients.',
        actionText: 'Sign In Again'
      };
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('connection')) {
      return {
        icon: WifiOff,
        title: 'Connection Problem',
        description: 'Unable to connect to the server. Please check your internet connection.',
        actionText: 'Retry Connection'
      };
    }
    
    if (errorMsg.includes('permission') || errorMsg.includes('access')) {
      return {
        icon: Shield,
        title: 'Access Restricted',
        description: 'You don\'t have permission to view these clients.',
        actionText: 'Contact Support'
      };
    }
    
    return {
      icon: AlertCircle,
      title: 'Error loading clients',
      description: errorMsg,
      actionText: 'Try Again'
    };
  };
  
  const errorInfo = getErrorInfo(error);
  const ErrorIcon = errorInfo.icon;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients
          </CardTitle>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <ErrorIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{errorInfo.title}</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">{errorInfo.description}</p>
          
          {onRefresh && (
            <div className="space-y-3">
              <Button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {errorInfo.actionText}
              </Button>
              
              <p className="text-sm text-gray-500">
                If the problem persists, try refreshing the page or contact support.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
