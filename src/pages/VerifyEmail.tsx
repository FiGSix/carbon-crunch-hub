import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerifyOtp = async (code: string) => {
    if (!email) {
      toast({
        title: "Email not found",
        description: "Please use the link in the email or sign up again.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (error) throw error;

      toast({
        title: "Email verified",
        description: "You're all set — taking you in now.",
      });

      // Session is established; route to callback which handles role-based redirect
      const redirectTo = data?.session ? '/auth/callback' : '/login';
      setTimeout(() => navigate(redirectTo), 600);
    } catch (error: any) {
      const msg = error?.message || "Invalid or expired code. Please try again.";
      setVerifyError(msg);
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email not found",
        description: "Unable to resend verification email. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      setResendSuccess(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast({
        title: "Verification email sent",
        description: "Check your inbox for a new 6-digit code and link.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-carbon-gray-600 hover:text-carbon-green-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </div>

          <Card className="retro-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-crunch-yellow/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-crunch-black" />
              </div>
              <CardTitle className="text-2xl font-bold text-carbon-gray-900">
                Welcome to the Crunch Carbon team!
              </CardTitle>
              <CardDescription className="text-base mt-4 leading-relaxed">
                We've sent you a 6-digit verification code and a verification link. Enter the code below, or click the link in the email — either works.
              </CardDescription>
              <p className="text-sm text-carbon-gray-600 mt-2 italic">
                Security first, this is South Africa after all ;)
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {email && (
                <Alert>
                  <AlertDescription>
                    Code sent to: <strong>{email}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-carbon-gray-900 block text-center">
                  Enter your 6-digit verification code
                </label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setVerifyError(null);
                      if (val.length === 6 && !isVerifying) {
                        handleVerifyOtp(val);
                      }
                    }}
                    disabled={isVerifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {verifyError && (
                  <p className="text-xs text-destructive text-center">{verifyError}</p>
                )}

                <Button
                  onClick={() => handleVerifyOtp(otp)}
                  disabled={otp.length !== 6 || isVerifying}
                  className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify code
                    </>
                  )}
                </Button>
              </div>

              {resendSuccess && (
                <Alert>
                  <AlertDescription className="text-green-700">
                    New verification email sent. The previous code is no longer valid.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 pt-2 border-t border-carbon-gray-200">
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending || !email || cooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : cooldown > 0 ? (
                    <>Resend available in {cooldown}s</>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-carbon-gray-600 mb-2">
                    Already verified your email?
                  </p>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Go to Login</Button>
                  </Link>
                </div>
              </div>

              <div className="text-xs text-carbon-gray-500 space-y-1">
                <p>• Check your spam/junk folder if you don't see the email</p>
                <p>• Code and link both expire in 24 hours</p>
                <p>• Resending invalidates any previously sent code</p>
                <p>• On a corporate email and the link doesn't work? Use the 6-digit code instead — security scanners can sometimes consume the link before you click it.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifyEmail;
