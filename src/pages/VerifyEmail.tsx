
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { toast } = useToast();

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
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
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
                Please head to your email to confirm your email address by clicking on the button within the email we sent. 
                Once done you can log in.
              </CardDescription>
              <p className="text-sm text-carbon-gray-600 mt-2 italic">
                Security first, this is South Africa after all ;)
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {email && (
                <Alert>
                  <AlertDescription>
                    We sent a verification email to: <strong>{email}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert>
                  <AlertDescription className="text-green-700">
                    Verification email sent successfully! Please check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending || !email}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
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
                    <Button className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-xs text-carbon-gray-500 space-y-1">
                <p>• Check your spam folder if you don't see the email</p>
                <p>• The verification link will expire in 24 hours</p>
                <p>• Make sure to click the link from the same device/browser</p>
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
