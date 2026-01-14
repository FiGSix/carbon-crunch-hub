import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { useToast } from '@/hooks/use-toast';

/**
 * Helper function to enforce minimum processing time for smooth UX
 */
async function enforceMinimumProcessingTime(startTime: number, minimumMs: number) {
  const elapsedTime = Date.now() - startTime;
  if (elapsedTime < minimumMs) {
    await new Promise(resolve => setTimeout(resolve, minimumMs - elapsedTime));
  }
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Phase 3: Add minimum processing time for smooth UX
      const minimumProcessingTime = 1500; // 1.5 seconds
      const startTime = Date.now();
      
      try {
        // Parse BOTH hash parameters (Supabase default) AND query parameters (custom email hook)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);
        
        // Helper to check both sources (query params take precedence for custom email hooks)
        const getParam = (key: string) => queryParams.get(key) || hashParams.get(key);

        // Get auth parameters from either source
        const errorParam = getParam('error');
        const errorCode = getParam('error_code');
        const errorDescription = getParam('error_description');
        const type = getParam('type');
        const tokenHash = getParam('token_hash'); // PKCE format (new)
        const confirmationToken = getParam('confirmation_token'); // Magic Link format (old)
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');
        const redirectTo = getParam('redirect_to');

        // Enhanced logging to debug parameter sources
        console.log('🔐 Auth callback URL parsing:', {
          fullUrl: window.location.href,
          queryString: window.location.search,
          hashString: window.location.hash,
          parsedType: type,
          hasTokenHash: !!tokenHash,
          tokenHashSource: queryParams.get('token_hash') ? 'query' : hashParams.get('token_hash') ? 'hash' : 'none'
        });

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
        
        // Phase 3: Improved logging
        console.log('🔐 Auth callback processing:', {
          type,
          hasTokenHash: !!tokenHash,
          hasConfirmationToken: !!confirmationToken,
          hasAccessToken: !!accessToken,
          redirectTo,
          hasProposalContext: redirectTo?.includes('view-proposal'),
          timestamp: new Date().toISOString()
        });

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
          // Phase 3 & 5: Email confirmation with deferred error handling and redirect support
          let verificationError: any = null;
          
          console.log('📧 Email verification attempt:', {
            type,
            hasTokenHash: !!tokenHash,
            hasConfirmationToken: !!confirmationToken,
            tokenHashPrefix: tokenHash?.substring(0, 8),
            confirmationTokenPrefix: confirmationToken?.substring(0, 8)
          });
          
          // Try PKCE method first (newer, recommended)
          if (tokenHash) {
            // Use the actual type from URL - 'signup' for new signups, 'email' for email changes
            const otpType = type === 'signup' ? 'signup' : 'email';
            console.log('🔑 Verifying OTP with type:', otpType);
            
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: otpType
            });

            if (verifyError) {
              console.warn('⚠️ PKCE verification failed, trying alternatives:', verifyError);
              verificationError = verifyError; // Store but don't show yet
            } else {
              // Success - ensure minimum time has passed
              await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
              setSuccess(true);
              setIsProcessing(false);
              
              // Phase 5: Smart redirect based on context
              const destination = redirectTo && redirectTo.startsWith('/') 
                ? redirectTo 
                : '/dashboard';
              
              toast({
                title: 'Email verified',
                description: redirectTo 
                  ? 'Your email has been verified. Returning to your proposal...'
                  : 'Your email has been verified. Redirecting to dashboard...',
              });

              window.history.replaceState(null, '', window.location.pathname);
              setTimeout(() => {
                navigate(destination);
              }, 2000);
              return;
            }
          }
          
          // Fall back to old Magic Link method
          if (confirmationToken) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: confirmationToken,
              type: 'magiclink'
            });

            if (verifyError) {
              console.warn('⚠️ Magic link verification failed:', verifyError);
            } else {
              // Success - ensure minimum time has passed
              await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
              setSuccess(true);
              setIsProcessing(false);
              
              // Phase 5: Smart redirect based on context
              const destination = redirectTo && redirectTo.startsWith('/') 
                ? redirectTo 
                : '/dashboard';
              
              toast({
                title: 'Email verified',
                description: redirectTo 
                  ? 'Your email has been verified. Returning to your proposal...'
                  : 'Your email has been verified. Redirecting to dashboard...',
              });

              window.history.replaceState(null, '', window.location.pathname);
              setTimeout(() => {
                navigate(destination);
              }, 2000);
              return;
            }
          }
          
          // Alternative: Direct session setup
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.warn('⚠️ Session setup failed:', sessionError);
            } else {
              // Success - ensure minimum time has passed
              await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
              setSuccess(true);
              setIsProcessing(false);
              
              // Phase 5: Smart redirect based on context
              const destination = redirectTo && redirectTo.startsWith('/') 
                ? redirectTo 
                : '/dashboard';
              
              toast({
                title: 'Email verified',
                description: redirectTo 
                  ? 'Your email has been verified. Returning to your proposal...'
                  : 'Your email has been verified. Redirecting to dashboard...',
              });

              window.history.replaceState(null, '', window.location.pathname);
              setTimeout(() => {
                navigate(destination);
              }, 2000);
              return;
            }
          }
          
          // Phase 3: Only show error after ALL methods have been tried
          await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
          setError('Failed to verify email. The link may have expired or already been used.');
          setIsProcessing(false);
          return;
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
