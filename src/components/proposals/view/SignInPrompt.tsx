
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, CheckCircle } from 'lucide-react';

interface SignInPromptProps {
  onSignInClick: () => void;
}

export function SignInPrompt({ onSignInClick }: SignInPromptProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mt-6 shadow-sm">
      <h3 className="text-xl font-medium text-blue-800 flex items-center">
        <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
        Ready to respond to this proposal?
      </h3>
      <p className="text-blue-600 mt-2 mb-4">
        Sign in or create an account to approve, reject, or save this proposal for later.
        Your email address will be pre-filled to make registration quick and easy.
      </p>
      <Button 
        onClick={onSignInClick}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in or Register to Respond
      </Button>
    </div>
  );
}
