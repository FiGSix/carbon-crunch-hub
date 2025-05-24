
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProposalErrorProps {
  errorMessage: string;
  onRetry?: () => void;
}

export function ProposalError({ errorMessage, onRetry }: ProposalErrorProps) {
  // Determine if this might be a token-related error
  const isTokenError = errorMessage.toLowerCase().includes('token') || 
                      errorMessage.toLowerCase().includes('invitation') ||
                      errorMessage.toLowerCase().includes('expired') ||
                      errorMessage.toLowerCase().includes('invalid');

  // Determine if this might be a permission error
  const isPermissionError = errorMessage.toLowerCase().includes('permission') ||
                           errorMessage.toLowerCase().includes('access') ||
                           errorMessage.toLowerCase().includes('unauthorized');

  // Create the support email URL
  const supportEmailUrl = `mailto:support@crunchcarbon.app?subject=Proposal Loading Error&body=I'm having trouble loading a proposal. Error: ${encodeURIComponent(errorMessage)}`;

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
          <p className="text-red-600 mb-6 font-medium">{errorMessage}</p>
          
          <div className="bg-white border border-red-100 rounded-md p-4 text-sm text-gray-600 mb-4">
            <p className="font-medium mb-2">Common reasons for this error:</p>
            <ul className="list-disc pl-5 space-y-1">
              {isTokenError && (
                <>
                  <li>The invitation link may have expired</li>
                  <li>The invitation token may be invalid or corrupted</li>
                  <li>This proposal may not have been sent via invitation</li>
                </>
              )}
              {isPermissionError && (
                <>
                  <li>You may not have permission to view this proposal</li>
                  <li>You may need to sign in with the correct account</li>
                </>
              )}
              <li>The proposal may have been deleted or archived</li>
              <li>There might be a temporary system issue</li>
              <li>Your internet connection may be unstable</li>
            </ul>
          </div>

          {isTokenError && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 mb-4">
              <p className="font-medium mb-1">💡 If you received this link via email:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Make sure you&apos;re using the complete link from the email</li>
                <li>Try copying and pasting the link directly into your browser</li>
                <li>Contact the person who sent you the proposal for a new link</li>
              </ul>
            </div>
          )}
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

          <Button variant="outline" asChild>
            <a 
              href={supportEmailUrl}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
