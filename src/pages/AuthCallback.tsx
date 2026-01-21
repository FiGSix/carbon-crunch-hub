import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
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
  
  // Phase 1: State for resend functionality
  const [flowType, setFlowType] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Phase 1: Resend password reset email
  const handleResendRecovery = async () => {
    if (!userEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address to receive a new reset link.",
        variant: "destructive"
      });
      return;
    }
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      
      if (error) {
        toast({
          title: "Failed to send reset link",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setResendSuccess(true);
        toast({
          title: "New reset link sent",
          description: "Check your email for the new password reset link.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset link",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  // Phase 1: Resend verification email
  const handleResendVerification = async () => {
    if (!userEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address to receive a new verification link.",
        variant: "destructive"
      });
      return;
    }
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        toast({
          title: "Failed to send verification link",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setResendSuccess(true);
        toast({
          title: "New verification link sent",
          description: "Check your email for the new verification link.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send verification link",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      const minimumProcessingTime = 1500;
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
        const tokenHash = getParam('token_hash');
        const confirmationToken = getParam('confirmation_token');
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');
        const redirectTo = getParam('redirect_to');

        // Phase 1: Store flow type for resend functionality
        if (type) {
          setFlowType(type);
        }

        console.log('🔐 Auth callback URL parsing:', {
          fullUrl: window.location.href,
          queryString: window.location.search,
          hashString: window.location.hash,
          parsedType: type,
          hasTokenHash: !!tokenHash,
          tokenHashSource: queryParams.get('token_hash') ? 'query' : hashParams.get('token_hash') ? 'hash' : 'none'
        });

        // Phase 2: Check if user is already authenticated before attempting verification
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession?.user) {
          // For signup/email flows, check if email is already confirmed
          if ((type === 'signup' || type === 'email' || !type) && existingSession.user.email_confirmed_at) {
            console.log('✅ User already verified, redirecting to success');
            setSuccess(true);
            setIsProcessing(false);
            
            toast({
              title: 'Already verified!',
              description: 'Your email was already verified. Redirecting...',
            });
            
            const destination = redirectTo?.startsWith('/') ? redirectTo : '/dashboard';
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => navigate(destination), 1500);
            return;
          }
          
          // For recovery flows with existing session, redirect to reset password
          if (type === 'recovery') {
            console.log('✅ Active session found for recovery, redirecting to reset password');
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/reset-password');
            return;
          }
          
          // Store email from existing session for resend functionality
          if (existingSession.user.email) {
            setUserEmail(existingSession.user.email);
          }
        }

        if (errorParam || errorCode) {
          // Phase 4: Improved error messages with scanner explanation
          let errorMessage = 'This link is invalid or has expired.';
          
          if (errorCode === 'otp_expired') {
            errorMessage = 'This verification link has expired. This sometimes happens when email security software pre-scans links. You can request a new link below.';
          } else if (errorParam === 'access_denied') {
            errorMessage = 'This link may have already been used or expired. Email security software sometimes pre-clicks links, consuming them before you can. You can request a new link below.';
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription);
          }
          
          // Detect if it might be a scanner issue and add helpful context
          if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('used')) {
            errorMessage += ' This can happen if your email provider\'s security software (like Microsoft SafeLinks) pre-scanned the link.';
          }
          
          setError(errorMessage);
          setIsProcessing(false);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        
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
          // Password recovery flow
          if (tokenHash) {
            console.log('🔑 Verifying recovery token_hash');
            
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            });

            if (verifyError) {
              console.error('Recovery verification failed:', {
                message: verifyError.message,
                status: verifyError.status,
                name: verifyError.name,
                fullError: verifyError
              });
              
              // Phase 4: More helpful error messages
              let userMessage = 'Verification failed. Please request a new reset link.';
              
              if (verifyError.message.includes('expired')) {
                userMessage = 'This reset link has expired. This can happen if your email provider\'s security software pre-scanned the link. Request a new one below.';
              } else if (verifyError.message.includes('invalid') || verifyError.message.includes('not found')) {
                userMessage = 'This link has already been used or is invalid. Email security software may have pre-clicked it. Request a new reset link below.';
              }
              
              setError(userMessage);
              setIsProcessing(false);
              return;
            }

            console.log('✅ Recovery token verified, redirecting to reset password');
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/reset-password');
            return;
          }
          
          // Fallback: Old format with access_token and refresh_token in URL
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              setError('Invalid or expired reset link. Please request a new one below.');
              setIsProcessing(false);
              return;
            }

            navigate('/reset-password');
            return;
          }
          
          setError('Invalid password reset link. Please request a new one below.');
          setIsProcessing(false);
          return;
        } else if (type === 'email' || type === 'signup' || type === 'email_change') {
          // Email confirmation with fallback type verification
          console.log('📧 Email verification attempt:', {
            type,
            hasTokenHash: !!tokenHash,
            hasConfirmationToken: !!confirmationToken,
            tokenHashPrefix: tokenHash?.substring(0, 8),
            confirmationTokenPrefix: confirmationToken?.substring(0, 8)
          });
          
          // Try PKCE method with fallback types
          if (tokenHash) {
            type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';
            
            const typesToTry: EmailOtpType[] = type === 'email_change' 
              ? ['email_change', 'email', 'signup']
              : type === 'signup'
                ? ['signup', 'email', 'magiclink']
                : ['email', 'signup', 'magiclink'];
            
            let verified = false;
            
            for (const attemptType of typesToTry) {
              console.log(`🔑 Trying verification with type: ${attemptType}`);
              
              const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: attemptType
              });

              if (!verifyError) {
                console.log(`✅ Verification succeeded with type: ${attemptType}`);
                verified = true;
                
                await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
                setSuccess(true);
                setIsProcessing(false);
                
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
              } else {
                console.warn(`⚠️ Verification with type '${attemptType}' failed:`, verifyError.message);
              }
            }
            
            if (!verified) {
              console.warn('⚠️ All OTP types failed, trying fallback methods...');
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
              await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
              setSuccess(true);
              setIsProcessing(false);
              
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
              await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
              setSuccess(true);
              setIsProcessing(false);
              
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
          
          // Phase 4: Improved error message
          await enforceMinimumProcessingTime(startTime, minimumProcessingTime);
          setError('Failed to verify email. The link may have expired or already been used. This can happen if email security software pre-scanned the link. Request a new one below.');
          setIsProcessing(false);
          return;
        } else if (type === 'invite') {
          // Team invitation
          if (tokenHash) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'invite'
            });

            if (verifyError) {
              setError('Failed to accept invitation. The link may have expired. Please contact your team admin for a new invitation.');
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

  // Phase 1: Enhanced error state with resend functionality
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
            
            {/* Resend success state */}
            {resendSuccess ? (
              <Alert className="border-green-200 bg-green-50">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  A new link has been sent to your email. Please check your inbox and spam folder.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Email input for resend */}
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Enter your email to request a new link:</Label>
                  <Input 
                    id="resend-email"
                    type="email"
                    placeholder="you@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    disabled={isResending}
                  />
                </div>
                
                {/* Contextual resend buttons */}
                {flowType === 'recovery' && (
                  <Button 
                    onClick={handleResendRecovery} 
                    disabled={isResending || !userEmail}
                    className="w-full"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Password Reset Email
                      </>
                    )}
                  </Button>
                )}
                
                {(flowType === 'signup' || flowType === 'email' || !flowType) && (
                  <Button 
                    onClick={handleResendVerification} 
                    disabled={isResending || !userEmail}
                    className="w-full"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            
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
