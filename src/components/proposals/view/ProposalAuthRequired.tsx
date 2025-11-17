import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, LogIn, RefreshCw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface ProposalAuthRequiredProps {
  onRetry: () => void;
}

export function ProposalAuthRequired({ onRetry }: ProposalAuthRequiredProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignIn = () => {
    navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <Card className="border-warning/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-warning" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Authentication Required</h2>
              <p className="text-muted-foreground">
                You're not signed in on this domain. Please sign in to view this proposal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button onClick={handleSignIn} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
              <Button onClick={onRetry} variant="outline" size="lg" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
              <strong>Tip:</strong> If you received this proposal by email, you can also use your invitation link.
            </p>
            
            {import.meta.env.DEV && (
              <div className="mt-6 pt-6 border-t w-full text-left">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Dev Note:</strong> This happens when Supabase auth hasn't initialized on this preview domain yet.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
