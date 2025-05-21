
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProposalErrorProps {
  errorMessage: string;
  onRetry?: () => void;
}

export function ProposalError({ errorMessage, onRetry }: ProposalErrorProps) {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <Card className="border border-red-200 bg-red-50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-6 w-6 text-red-500" />
            Error Loading Proposal
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-red-600 mb-6">{errorMessage}</p>
          
          <div className="bg-white border border-red-100 rounded-md p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Common reasons for this error:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The invitation link may have expired</li>
              <li>The proposal may have been deleted</li>
              <li>You may not have permission to view this proposal</li>
              <li>There might be a temporary system issue</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-3 pt-2">
          <Link to="/">
            <Button variant="outline" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </Link>
          
          {onRetry && (
            <Button 
              variant="default" 
              onClick={onRetry}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
