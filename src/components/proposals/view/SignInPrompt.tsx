
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface SignInPromptProps {
  onSignInClick: () => void;
}

export function SignInPrompt({ onSignInClick }: SignInPromptProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-medium text-blue-800">Want to respond to this proposal?</h3>
      <p className="text-blue-600 mt-2">
        Sign in or create an account to approve, reject, or save this proposal for later.
      </p>
      <Button 
        onClick={onSignInClick}
        className="mt-4"
        variant="outline"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in or Register
      </Button>
    </div>
  );
}
