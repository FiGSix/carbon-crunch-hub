import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateResults } from "@/lib/calculations/carbon";
import { useSendCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuickCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCalculatorModal({ open, onOpenChange }: QuickCalculatorModalProps) {
  const today = new Date();
  const [inputMode, setInputMode] = useState<'simple' | 'advanced'>('simple');
  const [systemSize, setSystemSize] = useState("");
  const [numberOfPanels, setNumberOfPanels] = useState("");
  const [panelWattage, setPanelWattage] = useState("450");
  const [customWattage, setCustomWattage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [commissioningDate, setCommissioningDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const sendResults = useSendCalculatorResults();

  // Calculate system size from panels and wattage
  const calculateSystemSize = (panels: string, wattage: string): number => {
    const numPanels = parseFloat(panels);
    const watts = parseFloat(wattage);
    
    if (isNaN(numPanels) || isNaN(watts) || numPanels <= 0 || watts <= 0) {
      return 0;
    }
    
    return (numPanels * watts) / 1000;
  };

  // Get calculated system size for simple mode
  const calculatedSystemSize = inputMode === 'simple' 
    ? calculateSystemSize(numberOfPanels, panelWattage === 'custom' ? customWattage : panelWattage)
    : 0;

  const handleModeToggle = (mode: 'simple' | 'advanced') => {
    setInputMode(mode);
    if (mode === 'simple') {
      setSystemSize("");
    } else {
      setNumberOfPanels("");
      setPanelWattage("450");
      setCustomWattage("");
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and calculate system size based on mode
    let sizeInKWp = 0;
    
    if (inputMode === 'simple') {
      if (!numberOfPanels) {
        toast({
          title: "Missing information",
          description: "Please enter the number of solar panels",
          variant: "destructive"
        });
        return;
      }
      
      const wattageToUse = panelWattage === 'custom' ? customWattage : panelWattage;
      if (!wattageToUse) {
        toast({
          title: "Missing information",
          description: "Please select or enter panel wattage",
          variant: "destructive"
        });
        return;
      }
      
      sizeInKWp = calculateSystemSize(numberOfPanels, wattageToUse);
      
      if (sizeInKWp <= 0) {
        toast({
          title: "Invalid input",
          description: "Please enter valid panel count and wattage",
          variant: "destructive"
        });
        return;
      }
      
      if (sizeInKWp > 15000) {
        toast({
          title: "System too large",
          description: "Calculated system size cannot exceed 15,000 kWp (15 MWp)",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Advanced mode
      if (!systemSize) {
        toast({
          title: "Missing information",
          description: "Please enter system size",
          variant: "destructive"
        });
        return;
      }
      
      sizeInKWp = parseFloat(systemSize);
      
      if (isNaN(sizeInKWp) || sizeInKWp <= 0) {
        toast({
          title: "Invalid system size",
          description: "Please enter a valid system size",
          variant: "destructive"
        });
        return;
      }
      
      if (sizeInKWp > 15000) {
        toast({
          title: "System too large",
          description: "System size cannot exceed 15,000 kWp (15 MWp)",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate email
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Validate name
    if (!name || !name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }

    // Validate address
    if (!address || !address.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your physical address",
        variant: "destructive"
      });
      return;
    }

    // Validate commissioning date
    const selectedDate = new Date(commissioningDate);
    const minDate = new Date('2022-09-15');
    
    if (selectedDate < minDate) {
      toast({
        title: "Invalid date",
        description: "Commissioning date must be on or after September 15, 2022",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Send email with results
      await sendResults.mutateAsync({
        email,
        name,
        systemSizeKwp: sizeInKWp,
        commissioningDate: commissioningDate,
        address: address,
        referralCode: localStorage.getItem('referralCode') || undefined
      });
      
      setEmailSent(true);
      
      toast({
        title: "Results sent!",
        description: "Check your email for your complete solar impact report"
      });
    } catch (error) {
      console.error("Error sending results:", error);
      toast({
        title: "Error",
        description: "Failed to send results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputMode('simple');
    setSystemSize("");
    setNumberOfPanels("");
    setPanelWattage("450");
    setCustomWattage("");
    setEmail("");
    setName("");
    setAddress("");
    setCommissioningDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    );
    setEmailSent(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tell Us About Your Solar System</DialogTitle>
        </DialogHeader>
        
        {emailSent ? (
          <div className="py-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Results Sent Successfully!
              </h3>
              <p className="text-muted-foreground">
                We've sent your complete solar impact report to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Check your inbox for detailed information about your potential earnings and environmental impact.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
              <Button 
                onClick={handleReset}
                variant="ghost"
                className="w-full"
              >
                Calculate Another System
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCalculate} className="space-y-6 py-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={inputMode === 'simple' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleModeToggle('simple')}
              >
                Simple Mode
              </Button>
              <Button
                type="button"
                variant={inputMode === 'advanced' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleModeToggle('advanced')}
              >
                Advanced Mode
              </Button>
            </div>

            {/* Simple Mode Inputs */}
            {inputMode === 'simple' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="numberOfPanels">How many solar panels do you have? *</Label>
                  <Input
                    id="numberOfPanels"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 12"
                    value={numberOfPanels}
                    onChange={(e) => setNumberOfPanels(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="panelWattage">
                    What's the wattage of each panel? *
                  </Label>
                  <Select value={panelWattage} onValueChange={setPanelWattage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">250W</SelectItem>
                      <SelectItem value="300">300W</SelectItem>
                      <SelectItem value="400">400W</SelectItem>
                      <SelectItem value="450">450W (Most Common)</SelectItem>
                      <SelectItem value="custom">Custom Wattage</SelectItem>
                    </SelectContent>
                  </Select>
                  {panelWattage === 'custom' && (
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Enter wattage (e.g. 500)"
                      value={customWattage}
                      onChange={(e) => setCustomWattage(e.target.value)}
                      className="mt-2"
                      required
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Check panel back or installation docs for wattage
                  </p>
                </div>

                {calculatedSystemSize > 0 && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Calculated System Size</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatedSystemSize.toFixed(2)} kWp
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Advanced Mode Input */}
            {inputMode === 'advanced' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="systemSize">System Size (kWp) *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Your system size in kilowatt-peak (kWp). This should be on your solar installation certificate.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Input
                    id="systemSize"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="15000"
                    placeholder="e.g., 5.5"
                    value={systemSize}
                    onChange={(e) => setSystemSize(e.target.value)}
                    className="pr-16"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    kWp
                  </span>
                </div>
              </div>
            )}

            {/* Commissioning Date */}
            <div className="space-y-2">
              <Label htmlFor="commissioningDate">Commissioning Date *</Label>
              <Input
                id="commissioningDate"
                type="date"
                value={commissioningDate}
                onChange={(e) => setCommissioningDate(e.target.value)}
                max={today.toISOString().split('T')[0]}
                required
              />
              <p className="text-sm text-muted-foreground">
                When was your system first switched on?
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                We'll send your complete solar impact report to this email
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Physical Address *</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, Cape Town, 8001"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Where is your solar system installed?
              </p>
            </div>
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Results...
                </>
              ) : (
                "Send My Results"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
