import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse URL hash parameters
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // Check for errors in the URL
        const errorParam = params.get('error');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');

        if (errorParam || errorCode) {
          let errorMessage = 'This link is invalid or has expired.';
          
          if (errorCode === 'otp_expired') {
            errorMessage = 'This verification link has expired. Please request a new one.';
          } else if (errorParam === 'access_denied') {
            errorMessage = 'Access denied. This link may have already been used or is invalid.';
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription);
          }
          
          setError(errorMessage);
          setIsProcessing(false);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }

        // Get auth type and tokens
        const type = params.get('type');
        const tokenHash = params.get('token_hash');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        // Handle different auth types
        if (type === 'recovery') {
          // Password recovery - redirect to reset password page with tokens
          if (accessToken && refreshToken) {
            // Set the session first
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              setError('Invalid or expired reset link. Please request a new one.');
              setIsProcessing(false);
              return;
            }

            // Redirect to reset password page
            navigate('/reset-password');
            return;
          } else {
            setError('Invalid password reset link. Please request a new one.');
            setIsProcessing(false);
            return;
          }
        } else if (type === 'email' || type === 'signup') {
          // Email confirmation
          if (tokenHash) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email'
            });

            if (verifyError) {
              setError('Failed to verify email. The link may have expired or already been used.');
              setIsProcessing(false);
              return;
            }

            // Success - email verified
            setSuccess(true);
            setIsProcessing(false);
            
            toast({
              title: 'Email verified',
              description: 'Your email has been successfully verified. Redirecting to dashboard...',
            });

            // Clear URL and redirect after a short delay
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
            return;
          } else if (accessToken && refreshToken) {
            // Alternative: Direct session setup
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              setError('Failed to verify email. Please try again.');
              setIsProcessing(false);
              return;
            }

            setSuccess(true);
            setIsProcessing(false);
            
            toast({
              title: 'Email verified',
              description: 'Your email has been successfully verified. Redirecting to dashboard...',
            });

            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
            return;
          }
        } else if (type === 'invite') {
          // Team invitation (future use)
          if (tokenHash) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'invite'
            });

            if (verifyError) {
              setError('Failed to accept invitation. The link may have expired.');
              setIsProcessing(false);
              return;
            }

            setSuccess(true);
            setIsProcessing(false);
            
            toast({
              title: 'Invitation accepted',
              description: 'Redirecting to dashboard...',
            });

            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
            return;
          }
        }

        // If we reach here, something is wrong with the link
        setError('Invalid verification link. Please try again or contact support.');
        setIsProcessing(false);

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (isProcessing) {
    return (
      <LoginLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-crunch-yellow/20 w-fit">
              <Loader2 className="h-6 w-6 text-crunch-black animate-spin" />
            </div>
            <CardTitle>Verifying...</CardTitle>
            <CardDescription>
              Please wait while we verify your authentication.
            </CardDescription>
          </CardHeader>
        </Card>
      </LoginLayout>
    );
  }

  if (error) {
    return (
      <LoginLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your authentication link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => navigate('/register')}
              className="w-full"
            >
              Go to Registration
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

  if (success) {
    return (
      <LoginLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 w-fit">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Verification Successful</CardTitle>
            <CardDescription>
              Your email has been verified. Redirecting you now...
            </CardDescription>
          </CardHeader>
        </Card>
      </LoginLayout>
    );
  }

  return null;
};

export default AuthCallback;
