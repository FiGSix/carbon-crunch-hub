
import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator as CalculatorIcon, ArrowRight, Loader2, Mail, CheckCircle2, Info, Zap } from "lucide-react";
import { IconCard } from "./IconCard";
import { BarChart3, TreePine, CircleDollarSign } from "lucide-react";
import { CalculationResults, calculateResults } from "@/lib/calculations/carbon";
import { normalizeToKWp } from "@/lib/calculations/carbon/core";
import { useSendCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalculatorFormProps {
  onResultsCalculated: (results: CalculationResults, systemSize: number, commissioningDate: Date) => void;
}

export const CalculatorForm = ({ onResultsCalculated }: CalculatorFormProps) => {
  const today = new Date();
  const [inputMode, setInputMode] = useState<'simple' | 'advanced'>('simple');
  const [systemSize, setSystemSize] = useState<string>("");
  const [numberOfPanels, setNumberOfPanels] = useState<string>("");
  const [panelWattage, setPanelWattage] = useState<string>("450");
  const [customWattage, setCustomWattage] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [commissioningDate, setCommissioningDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const sendResultsMutation = useSendCalculatorResults();
  
  // Calculate system size from panels and wattage
  const calculateSystemSize = (panels: string, wattage: string): number => {
    const numPanels = parseFloat(panels);
    const watts = parseFloat(wattage);
    
    if (isNaN(numPanels) || isNaN(watts) || numPanels <= 0 || watts <= 0) {
      return 0;
    }
    
    // panels × wattage ÷ 1000 = kWp
    return (numPanels * watts) / 1000;
  };
  
  // Get calculated system size for simple mode
  const calculatedSystemSize = inputMode === 'simple' 
    ? calculateSystemSize(numberOfPanels, panelWattage === 'custom' ? customWattage : panelWattage)
    : 0;
  
  const handleCalculate = async () => {
    // Validate email
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Validate and calculate system size based on mode
    let sizeInKWp = 0;
    
    if (inputMode === 'simple') {
      if (!numberOfPanels) {
        toast.error("Please enter the number of solar panels");
        return;
      }
      
      const wattageToUse = panelWattage === 'custom' ? customWattage : panelWattage;
      if (!wattageToUse) {
        toast.error("Please select or enter panel wattage");
        return;
      }
      
      sizeInKWp = calculateSystemSize(numberOfPanels, wattageToUse);
      
      if (sizeInKWp <= 0) {
        toast.error("Please enter valid panel count and wattage");
        return;
      }
      
      if (sizeInKWp > 15000) {
        toast.error("Calculated system size cannot exceed 15,000 kWp (15 MWp)");
        return;
      }
    } else {
      // Advanced mode
      if (!systemSize) {
        toast.error("Please enter system size");
        return;
      }
      
      sizeInKWp = normalizeToKWp(systemSize);
      if (isNaN(sizeInKWp) || sizeInKWp <= 0) {
        toast.error("Please enter a valid system size");
        return;
      }
    }
    
    if (!commissioningDate) {
      toast.error("Please select a commissioning date");
      return;
    }
    
    const commDate = new Date(commissioningDate);
    const minDate = new Date("2025-01-01");
    
    // Don't show estimates earlier than Jan 1, 2025
    if (commDate < minDate) {
      commDate.setFullYear(2025);
      commDate.setMonth(0);
      commDate.setDate(1);
    }
    
    setIsCalculating(true);
    
    try {
      await sendResultsMutation.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        systemSizeKwp: sizeInKWp,
        commissioningDate: commDate.toISOString().split('T')[0],
      });
      
      setEmailSent(true);
      toast.success("Check your email for your solar impact report!");
    } catch (error: any) {
      console.error("Error sending calculator results:", error);
      toast.error("Failed to send results. Please try again.");
    } finally {
      setIsCalculating(false);
    }
  };
  
  const handleReset = () => {
    setEmailSent(false);
    setSystemSize("");
    setNumberOfPanels("");
    setPanelWattage("450");
    setCustomWattage("");
    setEmail("");
    setName("");
  };
  
  const handleModeToggle = () => {
    setInputMode(inputMode === 'simple' ? 'advanced' : 'simple');
    // Clear inputs when switching modes
    if (inputMode === 'simple') {
      setNumberOfPanels("");
      setCustomWattage("");
    } else {
      setSystemSize("");
    }
  };
  
  if (emailSent) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="col-span-full"
        >
          <div className="meta-card p-6 md:p-12 text-center max-w-2xl mx-auto">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-crunch-black mb-4">
              Check Your Email! 📧
            </h2>
            <p className="text-lg text-crunch-black/70 mb-2">
              We've sent your complete solar impact report to
            </p>
            <p className="text-xl font-semibold text-crunch-black mb-6">
              {email}
            </p>
            <p className="text-crunch-black/60 mb-8">
              The link will be valid for 10 days. Check your spam folder if you don't see it in a few minutes.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-crunch-black text-crunch-black hover:bg-crunch-black/5"
              >
                Calculate Another System
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="order-2 lg:order-1"
      >
        <div className="meta-card pt-8 px-4 pb-4 md:p-6 lg:p-8 relative">
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-crunch-yellow/90 text-crunch-black font-medium px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-md">
            <span className="flex items-center justify-center text-sm md:text-base">
              <CalculatorIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> 
              Crunch the Numbers
            </span>
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6 text-crunch-black mt-2">
            Tell Us About Your Solar System
          </h2>
          
          {/* Mode Toggle */}
          <div className="flex justify-center mb-4 md:mb-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleModeToggle}
              className="text-xs border-crunch-black/20 text-crunch-black/70 hover:bg-crunch-black/5"
            >
              <span className="hidden sm:inline">
                {inputMode === 'simple' ? "I know my system size in kWp" : "Calculate from panel count"}
              </span>
              <span className="sm:hidden">
                {inputMode === 'simple' ? "Enter kWp" : "Enter panels"}
              </span>
            </Button>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            {inputMode === 'simple' ? (
              /* Simple Mode - Panel Count & Wattage */
              <>
                <div>
                  <label htmlFor="numberOfPanels" className="block text-sm font-medium text-crunch-black/70 mb-1">
                    How many solar panels do you have? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="numberOfPanels"
                    type="number"
                    min="1"
                    placeholder="e.g. 250"
                    value={numberOfPanels}
                    onChange={(e) => setNumberOfPanels(e.target.value)}
                    className="retro-input text-base md:text-lg"
                  />
                </div>
                
                <div>
                  <label htmlFor="panelWattage" className="block text-sm font-medium text-crunch-black/70 mb-1">
                    What's the wattage of each panel? <span className="text-red-500">*</span>
                  </label>
                  <Select value={panelWattage} onValueChange={setPanelWattage}>
                    <SelectTrigger className="retro-input text-base md:text-lg min-h-[44px]">
                      <SelectValue placeholder="Select panel wattage" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-crunch-black z-50">
                      <SelectItem value="350">350W</SelectItem>
                      <SelectItem value="400">400W</SelectItem>
                      <SelectItem value="450">450W (Most Common)</SelectItem>
                      <SelectItem value="500">500W</SelectItem>
                      <SelectItem value="550">550W</SelectItem>
                      <SelectItem value="600">600W</SelectItem>
                      <SelectItem value="custom">Custom Wattage</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {panelWattage === 'custom' && (
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter custom wattage (W)"
                      value={customWattage}
                      onChange={(e) => setCustomWattage(e.target.value)}
                      className="retro-input text-base md:text-lg mt-2"
                    />
                  )}
                  
                  <p className="text-xs text-crunch-black/60 mt-1">
                    <Info className="h-3 w-3 inline mr-1" />
                    Check panel back or installation docs for wattage
                  </p>
                </div>
                
                {/* Live Calculation Preview */}
                {calculatedSystemSize > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-crunch-yellow/20 border-2 border-crunch-yellow rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-5 w-5 text-crunch-black" />
                      <span className="text-sm font-medium text-crunch-black">Your System Size:</span>
                    </div>
                    <p className="text-2xl font-bold text-crunch-black">
                      {calculatedSystemSize.toFixed(2)} kWp
                    </p>
                    <p className="text-xs text-crunch-black/60 mt-1">
                      {numberOfPanels} panels × {panelWattage === 'custom' ? customWattage : panelWattage}W each
                    </p>
                  </motion.div>
                )}
              </>
            ) : (
              /* Advanced Mode - Direct System Size Input */
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="systemSize" className="block text-sm font-medium text-crunch-black/70">
                    System Size (kWp or MWp) <span className="text-red-500">*</span>
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-crunch-black/40 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-white border-2 border-crunch-black">
                        <p className="text-sm">kWp = kilowatt-peak (your system's rated capacity)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="systemSize"
                  type="text"
                  placeholder="e.g. 100 kWp or 1.5 MWp"
                  value={systemSize}
                  onChange={(e) => setSystemSize(e.target.value)}
                  className="retro-input text-base md:text-lg"
                />
                <p className="text-xs text-crunch-black/60 mt-1">
                  Enter with unit (kWp/MWp) or value will default to kWp
                </p>
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="commissioningDate" className="block text-sm font-medium text-crunch-black/70">
                  Commissioning Date <span className="text-red-500">*</span>
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-crunch-black/40 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border-2 border-crunch-black max-w-xs">
                      <p className="text-sm">
                        We are sorry but projects which was commissioned or installed prior to 15 September 2022 can not participate on the Crunch Carbon Carbon Credit program due to the commissioning date rules with our Verra registered project. We're sorry about that.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="commissioningDate"
                type="date"
                value={commissioningDate}
                min="2022-09-15"
                onChange={(e) => setCommissioningDate(e.target.value)}
                className="retro-input text-base md:text-lg"
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-crunch-black/70 mb-1">
                Your Name (Optional)
              </label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="retro-input text-base md:text-lg"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-crunch-black/70 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input text-base md:text-lg"
              />
              <p className="text-xs text-crunch-black/60 mt-1">
                We'll send your complete solar impact report to this email
              </p>
            </div>
            
            <Button 
              onClick={handleCalculate}
              disabled={
                isCalculating || 
                !email || 
                (inputMode === 'simple' && (!numberOfPanels || calculatedSystemSize <= 0)) ||
                (inputMode === 'advanced' && (!systemSize || normalizeToKWp(systemSize) <= 0))
              }
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium text-base md:text-lg py-4 md:py-6 rounded-xl group transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none min-h-[44px]"
            >
              {isCalculating ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                  Sending Your Report...
                </span>
              ) : (
                <span className="flex items-center">
                  Send My Results
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="order-1 lg:order-2 hidden lg:block"
      >
        <div className="meta-card p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-2xl font-bold text-crunch-black mb-4">
              Get Your Free Solar Impact Report
            </p>
            <p className="text-crunch-black/70 mb-6">
              Enter your system details and email to receive a comprehensive report showing your solar system's potential carbon credits and revenue.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <IconCard 
                icon={BarChart3}
                title="Energy" 
                description="Calculate your solar energy generation"
              />
              <IconCard 
                icon={TreePine}
                title="Impact" 
                description="See your carbon offset equivalent"
              />
              <IconCard 
                icon={CircleDollarSign}
                title="Value" 
                description="Reveal potential earnings"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
