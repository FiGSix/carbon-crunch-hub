

import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecurity } from '@/hooks/useSecurity';

interface SecurityStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function SecurityStatus({ showDetails = false, className }: SecurityStatusProps) {
  const { isSecure, warnings, isLoading, lastAudit, runFullAudit } = useSecurity();

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isSecure) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  const getStatusColor = () => {
    if (isSecure) return 'bg-green-100 text-green-800';
    return 'bg-orange-100 text-orange-800';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <Badge variant="outline" className={getStatusColor()}>
          {isSecure ? 'Secure' : 'Security Issues'}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription>
          Application security monitoring and audit results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              {isSecure ? 'System Secure' : 'Security Issues Detected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runFullAudit}
            disabled={isLoading}
          >
            {isLoading ? 'Running Audit...' : 'Run Full Audit'}
          </Button>
        </div>

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Security Warnings:</p>
                <ul className="list-disc list-inside text-sm">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {lastAudit && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Last Audit: {lastAudit.timestamp.toLocaleString()}</p>
            <div className="space-y-1">
              {lastAudit.checks.map((check, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {check.passed ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                  )}
                  <span className={check.passed ? 'text-green-700' : 'text-orange-700'}>
                    {check.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
