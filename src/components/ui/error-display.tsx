
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, RefreshCw, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { ErrorSeverity } from "@/hooks/useErrorHandler";
import { cn } from "@/lib/utils";

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string | null;
  code?: string | null;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  onBack?: () => void;
  backPath?: string;
  className?: string;
  compact?: boolean;
}

/**
 * A standardized error display component that can be used across the application
 */
export function ErrorDisplay({
  title,
  message,
  details,
  code,
  severity = "error",
  onRetry,
  onBack,
  backPath,
  className,
  compact = false
}: ErrorDisplayProps) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };
  
  const getIcon = () => {
    switch (severity) {
      case "info":
        return <Info className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "error":
      case "fatal":
        return <AlertCircle className="h-5 w-5" />;
    }
  };
  
  const getColor = () => {
    switch (severity) {
      case "info":
        return "text-blue-500";
      case "warning":
        return "text-amber-500";
      case "error":
        return "text-destructive";
      case "fatal":
        return "text-red-700";
    }
  };
  
  if (compact) {
    return (
      <Alert variant={severity === "info" ? "default" : "destructive"} className={className}>
        <AlertTitle className="flex items-center gap-2">
          {getIcon()}
          {title || (severity === "error" ? "Error" : severity === "warning" ? "Warning" : "Notice")}
        </AlertTitle>
        <AlertDescription>
          {message}
          {code && <p className="text-xs opacity-70 mt-1">Code: {code}</p>}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card className={cn("shadow-md", className)}>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", getColor())}>
          {getIcon()}
          {title || (severity === "error" ? "Error" : severity === "warning" ? "Warning" : "Notice")}
        </CardTitle>
        <CardDescription>
          {code && <span className="font-mono text-xs">Code: {code}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className={cn(
          "text-carbon-gray-700",
          severity === "fatal" && "text-destructive font-medium"
        )}>
          {message}
        </p>
        {details && (
          <pre className="mt-4 p-3 bg-muted text-xs overflow-auto rounded-md max-h-32">
            {details}
          </pre>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline"
          onClick={handleBack}
          className="w-full lg:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        {onRetry && (
          <Button 
            onClick={onRetry} 
            className="w-full lg:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

