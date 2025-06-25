
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

interface LoginFormProps {
  loginAttempts: number;
  onLoginAttempt: () => void;
}

export function LoginForm({ loginAttempts, onLoginAttempt }: LoginFormProps) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (import.meta.env.DEV) {
        console.log(`🔐 Attempting to sign in with email: ${email}`);
      }
      const { error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ Sign in successful, refreshing user data');
      }
      
      // Refresh user data and wait for it to complete
      await refreshUser();
      
      toast({
        title: 'Success',
        description: 'You have successfully logged in',
      });
      
      // REMOVED: All redirect logic - let Login.tsx handle this via auth state changes
      if (import.meta.env.DEV) {
        console.log('🔄 Login successful, auth state will trigger redirect');
      }
      
    } catch (error: any) {
      onLoginAttempt();
      toast({
        title: 'Login failed',
        description: error.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {loginAttempts >= 2 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Having trouble logging in? Try our <Link to="/force-logout" className="font-medium underline">
              force logout
            </Link> tool to fix session issues.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 border-2 border-crunch-black/10 focus:border-crunch-yellow"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-sm text-crunch-yellow hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 pr-10 border-2 border-crunch-black/10 focus:border-crunch-yellow"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-crunch-black/50 hover:text-crunch-black focus:outline-none mt-1"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-crunch-black/70">
          Don't have an account?{' '}
          <Link to="/register" className="text-crunch-yellow hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
