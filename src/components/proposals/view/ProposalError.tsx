
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

interface ProposalErrorProps {
  errorMessage: string;
}

export function ProposalError({ errorMessage }: ProposalErrorProps) {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="bg-red-50 border border-red-300 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold text-red-700 mb-3">Error Loading Proposal</h2>
        <p className="text-red-600 mb-6 max-w-md mx-auto">{errorMessage}</p>
        
        <Link to="/">
          <Button variant="outline" className="flex items-center">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
