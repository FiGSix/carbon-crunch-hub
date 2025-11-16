import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateResults } from "@/lib/calculations/carbon";
import { useSendCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface QuickCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCalculatorModal({ open, onOpenChange }: QuickCalculatorModalProps) {
  const [systemSize, setSystemSize] = useState("");
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const sendResults = useSendCalculatorResults();

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const size = parseFloat(systemSize);
    if (!size || size <= 0 || size > 15) {
      toast({
        title: "Invalid system size",
        description: "Please enter a valid system size between 0.1 and 15 kWp",
        variant: "destructive"
      });
      return;
    }

    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Calculate results
      const calculationResults = calculateResults(size, new Date(), "kWp");
      
      // Send email
      await sendResults.mutateAsync({
        email,
        systemSizeKwp: size,
        commissioningDate: new Date().toISOString(),
        referralCode: localStorage.getItem('referralCode') || undefined
      });
      
      setResults({
        annualRevenue: Math.round(calculationResults.carbonCredits * 250 * 0.75), // Approximate
        systemSize: size
      });
      
      toast({
        title: "Results calculated!",
        description: "Check your email for the full report"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    onOpenChange(false);
    navigate(`/register?email=${encodeURIComponent(email)}&systemSize=${systemSize}`);
  };

  const handleClose = () => {
    setSystemSize("");
    setEmail("");
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Get Your Free Estimate</DialogTitle>
        </DialogHeader>
        
        {!results ? (
          <form onSubmit={handleCalculate} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="systemSize">System Size</Label>
              <div className="relative">
                <Input
                  id="systemSize"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="15"
                  placeholder="e.g., 5"
                  value={systemSize}
                  onChange={(e) => setSystemSize(e.target.value)}
                  className="pr-16"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  kWp
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Not sure? We'll help you calculate this later.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Show Me My Earnings →"
              )}
            </Button>
          </form>
        ) : (
          <div className="py-6 text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-muted-foreground">
                Your Estimated Annual Earnings
              </h3>
              <p className="text-4xl font-bold text-primary">
                R{results.annualRevenue.toLocaleString()}
              </p>
              <p className="text-muted-foreground">
                Based on {results.systemSize} kWp system
              </p>
            </div>
            
            <Button 
              onClick={handleCreateAccount}
              className="w-full h-12 text-lg"
            >
              Create Free Account to Continue →
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
