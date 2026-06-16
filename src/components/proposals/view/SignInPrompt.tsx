

import { Button } from '@/components/ui/button';
import { LogIn, CheckCircle, Sparkles } from 'lucide-react';

interface SignInPromptProps {
  onSignInClick: () => void;
  context?: 'proposal' | 'calculator';
}

export function SignInPrompt({ onSignInClick, context = 'proposal' }: SignInPromptProps) {
  const isCalculator = context === 'calculator';
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mt-6 shadow-sm">
      <h3 className="text-xl font-medium text-blue-800 flex items-center">
        {isCalculator ? (
          <>
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Ready to save your results?
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
            Ready to approve or reject this proposal?
          </>
        )}
      </h3>
      <p className="text-blue-600 mt-3 mb-1">
        You're viewing as a guest. To {isCalculator ? 'save these results and access them later' : 'respond'}, you'll need to either:
      </p>
      <ul className="text-blue-700 mb-4 ml-5 space-y-1 list-disc">
        <li>Create your account (takes 30 seconds)</li>
        <li>Sign in if you already have an account</li>
      </ul>
      <p className="text-sm text-blue-600 mb-4">
        Your email will be pre-filled to make this quick and easy.
      </p>
      
      <Button 
        onClick={onSignInClick}
        className="bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Continue to {isCalculator ? 'Save Results' : 'Respond'}
      </Button>
    </div>
  );
}
