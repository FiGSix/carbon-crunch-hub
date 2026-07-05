import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calculator as CalculatorIcon, ArrowRight, CalendarIcon, Info, Zap } from "lucide-react";
import { IconCard } from "./IconCard";
import { BarChart3, TreePine, CircleDollarSign } from "lucide-react";
import { CalculationResults, calculateResults } from "@/lib/calculations/carbon";
import { normalizeToKWp } from "@/lib/calculations/carbon/core";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CalculatorFormProps {
  onResultsCalculated: (results: CalculationResults, systemSize: number, commissioningDate: Date) => void;
}

export const CalculatorForm = ({ onResultsCalculated }: CalculatorFormProps) => {
  const [inputMode, setInputMode] = useState<'simple' | 'advanced'>('simple');
  const [systemSize, setSystemSize] = useState<string>("");
  const [numberOfPanels, setNumberOfPanels] = useState<string>("");
  const [panelWattage, setPanelWattage] = useState<string>("450");
  const [customWattage, setCustomWattage] = useState<string>("");
  const [commissioningDate, setCommissioningDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate system size from panels and wattage
  const calculateSystemSize = (panels: string, wattage: string): number => {
    const numPanels = parseFloat(panels);
    const watts = parseFloat(wattage);

    if (isNaN(numPanels) || isNaN(watts) || numPanels <= 0 || watts <= 0) {
      return 0;
    }

    return (numPanels * watts) / 1000;
  };

  const calculatedSystemSize = inputMode === 'simple'
    ? calculateSystemSize(numberOfPanels, panelWattage === 'custom' ? customWattage : panelWattage)
    : 0;

  const handleCalculate = () => {
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

    try {
      const results = calculateResults(sizeInKWp, commDate);
      onResultsCalculated(results, sizeInKWp, commDate);
    } catch (error) {
      console.error("Error calculating results:", error);
      toast.error("Something went wrong calculating your estimate. Please try again.");
    }
  };

  const handleModeToggle = () => {
    setInputMode(inputMode === 'simple' ? 'advanced' : 'simple');
    if (inputMode === 'simple') {
      setNumberOfPanels("");
      setCustomWattage("");
    } else {
      setSystemSize("");
    }
  };

  const canCalculate =
    ((inputMode === 'simple' && numberOfPanels !== "" && calculatedSystemSize > 0) ||
    (inputMode === 'advanced' && systemSize !== "" && normalizeToKWp(systemSize) > 0)) &&
    !!commissioningDate;

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

          <h2 className="text-xl md:text-2xl font-bold text-center mb-2 text-crunch-black mt-2">
            Tell Us About Your Solar System
          </h2>
          <p className="text-center text-sm text-crunch-black/60 mb-4 md:mb-6">
            Free • No signup required • Instant results
          </p>

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
                      {parseFloat(calculatedSystemSize.toFixed(3))} kWp
                    </p>
                    <p className="text-xs text-crunch-black/60 mt-1">
                      {numberOfPanels} panels × {panelWattage === 'custom' ? customWattage : panelWattage}W each
                    </p>
                  </motion.div>
                )}
              </>
            ) : (
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
                <label className="block text-sm font-medium text-crunch-black/70">
                  Commissioning Date <span className="text-red-500">*</span>
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-crunch-black/40 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border-2 border-crunch-black max-w-xs">
                      <p className="text-sm">
                        We are sorry but projects which were commissioned or installed prior to 15 September 2022 can not participate on the Crunch Carbon Carbon Credit program due to the commissioning date rules with our Verra registered project. We're sorry about that.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "retro-input w-full justify-start text-left font-normal h-auto px-4 py-3 rounded-lg border text-base md:text-lg",
                      !commissioningDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {commissioningDate ? (
                      format(commissioningDate, "dd MMM yyyy")
                    ) : (
                      <span>Select the date your system was installed</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={commissioningDate}
                    onSelect={(date) => {
                      setCommissioningDate(date);
                      if (date) setCalendarOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date < new Date(2022, 8, 15)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium text-base md:text-lg py-4 md:py-6 rounded-xl group transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none min-h-[44px]"
            >
              <span className="flex items-center">
                Calculate My Earnings
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>

            <p className="text-center text-xs text-crunch-black/50">
              We'll show your Rand earnings instantly. You can optionally email the full report from the results page.
            </p>
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
              Instant Solar Earnings Estimate
            </p>
            <p className="text-crunch-black/70 mb-6">
              Enter your system details and see your carbon credit revenue on the spot. No signup, no waiting — email delivery is optional.
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
