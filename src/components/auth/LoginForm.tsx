
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { ButtonLoading } from '@/components/ui/loading-states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from '@/lib/supabase';
import { SimpleFormWrapper } from '@/components/forms/UnifiedFormWrapper';
import { useUnifiedFormHandler } from '@/hooks/useUnifiedFormHandler';

interface LoginFormProps {
  loginAttempts: number;
  onLoginAttempt: () => void;
}

export function LoginForm({ loginAttempts, onLoginAttempt }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { isSubmitting } = useUnifiedFormHandler({
    formName: 'Login Form'
  });

  const handleSubmit = async () => {
    // Basic validation
    if (!email || !password) {
      throw new Error('Please enter both email and password');
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      onLoginAttempt();
      throw error;
    }

    return { success: true };
  };

  return (
    <>
      {loginAttempts >= 2 && (
        <Alert 
          variant="destructive" 
          className="mb-6"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Having trouble logging in? Try our <Link 
              to="/force-logout" 
              className="font-medium underline focus:outline-none focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 rounded-sm"
              aria-label="Use force logout tool to fix session issues"
            >
              force logout
            </Link> tool to fix session issues.
          </AlertDescription>
        </Alert>
      )}

      <SimpleFormWrapper
        formName="Login Form"
        onSubmit={handleSubmit}
        successMessage="You have successfully logged in"
        retryAttempts={2}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">
              Email
              <span className="text-destructive ml-1" aria-label="required">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 border-2 border-crunch-black/10 focus:border-crunch-yellow focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 min-h-[44px]"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              aria-describedby="email-description"
              aria-invalid="false"
              autoComplete="email"
            />
            <p id="email-description" className="sr-only">
              Enter your email address to log in
            </p>
          </div>
          
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">
                Password
                <span className="text-destructive ml-1" aria-label="required">*</span>
              </Label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-crunch-yellow hover:underline focus:outline-none focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 rounded-sm px-1 py-1 min-h-[44px] inline-flex items-center"
                aria-label="Reset your password"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 pr-10 border-2 border-crunch-black/10 focus:border-crunch-yellow focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 min-h-[44px]"
                required
                disabled={isSubmitting}
                aria-describedby="password-description"
                aria-invalid="false"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-crunch-black/50 hover:text-crunch-black focus:outline-none focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 rounded-sm mt-1 min-w-[44px] min-h-[44px]"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-describedby="password-toggle-description"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <p id="password-description" className="sr-only">
                Enter your password to log in
              </p>
              <p id="password-toggle-description" className="sr-only">
                Toggle password visibility
              </p>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full min-h-[44px] text-base"
            disabled={isSubmitting}
            aria-describedby={isSubmitting ? "login-status" : undefined}
          >
            <ButtonLoading 
              loading={isSubmitting}
              loadingText="Logging in..."
            >
              Log in
            </ButtonLoading>
          </Button>
        </div>
      </SimpleFormWrapper>
      
      <div className="mt-6 text-center">
        <p className="text-crunch-black/70">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="text-crunch-yellow hover:underline focus:outline-none focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 rounded-sm px-1 py-1 min-h-[44px] inline-flex items-center"
            aria-label="Create a new account"
          >
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
