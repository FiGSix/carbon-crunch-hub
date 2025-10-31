import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { CalculationResults } from "./CalculationResults";
import { calculateResults } from "@/lib/calculations/carbon";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";
import { SignInPrompt } from "@/components/proposals/view/SignInPrompt";
import { CalculatorResult } from "@/hooks/calculator/useCalculatorResults";

interface CalculatorResultsContentProps {
  result: CalculatorResult | null;
  loading: boolean;
  error: Error | null;
  token: string | null;
  user: any;
  showAuthForm: boolean;
  handleAuthComplete: () => void;
  showSignInPrompt: boolean;
  handleSignInClick: () => void;
}

export function CalculatorResultsContent({
  result,
  loading,
  error,
  token,
  user,
  showAuthForm,
  handleAuthComplete,
  showSignInPrompt,
  handleSignInClick
}: CalculatorResultsContentProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-crunch-cream to-white">
        <Header />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-crunch-yellow mx-auto mb-4" />
            <p className="text-lg text-crunch-black/70">Loading your solar impact report...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !result) {
    const isExpired = error?.message === "EXPIRED";
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-crunch-cream to-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="meta-card p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-crunch-black mb-4">
                {isExpired ? "Link Expired" : "Invalid Link"}
              </h1>
              <p className="text-crunch-black/70 mb-6">
                {isExpired
                  ? "This results link has expired. Links are valid for 48 hours from when they're sent."
                  : "This results link is invalid or has been used already."}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate("/calculator")}
                  className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Calculator
                </Button>
                <Button
                  onClick={() => navigate("/signup")}
                  variant="outline"
                  className="border-crunch-black text-crunch-black hover:bg-crunch-black/5"
                >
                  Sign Up for Account
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show auth form overlay
  if (showAuthForm && result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-crunch-cream to-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-center mb-4 text-crunch-black">
            Create your account to save your results
          </h1>
          <p className="text-center text-crunch-black/70 mb-8">
            Sign up to track your solar projects and start earning carbon credits.
          </p>
          <ClientAuthWrapper
            proposalId={result.id}
            clientEmail={result.email}
            onAuthComplete={handleAuthComplete}
            requireAuth={true}
            context="calculator"
          />
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate results using the same logic as calculator form
  const commDate = new Date(result.commissioning_date);
  const calculationResults = calculateResults(result.system_size_kwp, commDate, 'kWp');

  return (
    <div className="min-h-screen bg-gradient-to-b from-crunch-cream to-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-crunch-black mb-2">
              Your Solar Impact Report
            </h1>
            {result.name && (
              <p className="text-lg text-crunch-black/70">
                Generated for {result.name}
              </p>
            )}
            <p className="text-sm text-crunch-black/60 mt-2">
              {result.system_size_kwp} kWp System • Commissioning {new Date(result.commissioning_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Results */}
          <CalculationResults
            results={calculationResults}
            systemSize={result.system_size_kwp}
            commissioningDate={commDate}
            onReset={() => navigate("/calculator")}
            hideActions={true}
          />

          {/* Sign In Prompt - Show when not logged in */}
          {showSignInPrompt && (
            <SignInPrompt 
              onSignInClick={handleSignInClick}
              context="calculator"
            />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
