import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoginLayout } from '@/components/auth/LoginLayout';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);

  // Check for valid session - either from URL tokens or from AuthCallback redirect
  useEffect(() => {
    const checkSession = async () => {
      // First, check if there's already an active session (from AuthCallback redirect)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ ResetPassword: Active session found');
        setIsValidSession(true);
        // Clear any hash for security
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }
      
      // Fallback: Parse tokens from URL hash fragment (direct link scenario)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      // Check for errors in the URL
      const errorParam = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');
      
      if (errorParam || errorCode) {
        let errorMessage = 'This reset link has expired or was already used. Please request a new one.';
        
        if (errorCode === 'otp_expired') {
          errorMessage = 'This reset link has expired. Please request a new one.';
        } else if (errorParam === 'access_denied') {
          errorMessage = 'Access denied. This link may have already been used or is invalid.';
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }
        
        setError(errorMessage);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      
      // If we have URL tokens, try to set the session
      if (accessToken && refreshToken) {
        if (type !== 'recovery') {
          setError('Invalid password reset link type. Please request a new one.');
          return;
        }
        
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          setError('Invalid or expired reset link. Please request a new one.');
        } else {
          setIsValidSession(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }
      
      // No session and no URL tokens - invalid access
      console.log('❌ ResetPassword: No valid session or tokens found');
      setError('Invalid password reset link. Please request a new one.');
    };

    checkSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to update password. Please try again.');
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !isValidSession) {
    return (
      <LoginLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => navigate('/forgot-password')}
              className="w-full"
            >
              Request new reset link
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/login')}
                className="text-crunch-yellow"
              >
                Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </LoginLayout>
    );
  }

  if (isSuccess) {
    return (
      <LoginLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 w-fit">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Password Updated</CardTitle>
            <CardDescription>
              Your password has been successfully updated. You will be redirected to the login page.
            </CardDescription>
          </CardHeader>
        </Card>
      </LoginLayout>
    );
  }

  return (
    <LoginLayout>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 pr-10 border-2 border-crunch-black/10 focus:border-crunch-yellow"
                  placeholder="Enter new password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-crunch-black/50 hover:text-crunch-black focus:outline-none mt-1"
                  onClick={() => setShowPassword(!showPassword)}
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

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 pr-10 border-2 border-crunch-black/10 focus:border-crunch-yellow"
                  placeholder="Confirm new password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-crunch-black/50 hover:text-crunch-black focus:outline-none mt-1"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
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
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default ResetPassword;