
import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator as CalculatorIcon, ArrowRight, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { IconCard } from "./IconCard";
import { BarChart3, TreePine, CircleDollarSign } from "lucide-react";
import { CalculationResults, calculateResults } from "@/lib/calculations/carbon";
import { normalizeToKWp } from "@/lib/calculations/carbon/core";
import { useSendCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { toast } from "sonner";

interface CalculatorFormProps {
  onResultsCalculated: (results: CalculationResults, systemSize: number, commissioningDate: Date) => void;
}

export const CalculatorForm = ({ onResultsCalculated }: CalculatorFormProps) => {
  const today = new Date();
  const [systemSize, setSystemSize] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [commissioningDate, setCommissioningDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const sendResultsMutation = useSendCalculatorResults();
  
  const handleCalculate = async () => {
    // Validate inputs
    if (!systemSize || !commissioningDate || !email) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Normalize the system size to kWp
    const sizeInKWp = normalizeToKWp(systemSize);
    if (isNaN(sizeInKWp) || sizeInKWp <= 0) {
      toast.error("Please enter a valid system size");
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
    setEmail("");
    setName("");
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
          <div className="meta-card p-12 text-center max-w-2xl mx-auto">
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
              The link will be valid for 48 hours. Check your spam folder if you don't see it in a few minutes.
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
        <div className="meta-card p-8 relative">
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-crunch-yellow/90 text-crunch-black font-medium px-4 py-2 rounded-full shadow-md">
            <span className="flex items-center">
              <CalculatorIcon className="mr-2 h-4 w-4" /> 
              Crunch the Numbers
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-6 text-crunch-black mt-2">
            Tell Us About Your Solar System
          </h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="systemSize" className="block text-sm font-medium text-crunch-black/70 mb-1">
                System Size (kWp or MWp) <span className="text-red-500">*</span>
              </label>
              <Input
                id="systemSize"
                type="text"
                placeholder="e.g. 100 kWp or 1.5 MWp"
                value={systemSize}
                onChange={(e) => setSystemSize(e.target.value)}
                className="retro-input text-lg"
              />
              <p className="text-xs text-crunch-black/60 mt-1">
                Enter with unit (kWp/MWp) or value will default to kWp
              </p>
            </div>
            
            <div>
              <label htmlFor="commissioningDate" className="block text-sm font-medium text-crunch-black/70 mb-1">
                Commissioning Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="commissioningDate"
                type="date"
                value={commissioningDate}
                min="2025-01-01"
                onChange={(e) => setCommissioningDate(e.target.value)}
                className="retro-input text-lg"
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
                className="retro-input text-lg"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-crunch-black/70 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-crunch-black/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="retro-input text-lg pl-11"
                />
              </div>
              <p className="text-xs text-crunch-black/60 mt-1">
                We'll send your complete solar impact report to this email
              </p>
            </div>
            
            <Button 
              onClick={handleCalculate}
              disabled={isCalculating || !systemSize || !email || normalizeToKWp(systemSize) <= 0}
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium text-lg py-6 rounded-xl group transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
        className="order-1 lg:order-2"
      >
        <div className="meta-card p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-2xl font-bold text-crunch-black mb-4">
              Get Your Free Solar Impact Report
            </p>
            <p className="text-crunch-black/70 mb-6">
              Enter your system details and email to receive a comprehensive report showing your solar system's potential carbon credits and revenue.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mt-8">
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
