
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Calculator as CalculatorIcon, 
  ArrowRight, 
  Loader2,
  BarChart3,
  TreePine,
  CircleDollarSign,
  CalendarDays,
  LucideProps
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Calculator = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [systemSize, setSystemSize] = useState<string>("");
  const [commissioningDate, setCommissioningDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);
  
  const handleCalculate = () => {
    // Validate inputs
    if (!systemSize || !commissioningDate) return;
    
    const size = parseFloat(systemSize);
    if (isNaN(size) || size <= 0) return;
    
    const commDate = new Date(commissioningDate);
    const minDate = new Date("2025-01-01");
    
    // Don't show estimates earlier than Jan 1, 2025
    if (commDate < minDate) {
      commDate.setFullYear(2025);
      commDate.setMonth(0);
      commDate.setDate(1);
    }
    
    setIsCalculating(true);
    
    // Simulate calculation delay for better UX
    setTimeout(() => {
      const calculationResults = calculateResults(size, commDate);
      setResults(calculationResults);
      setIsCalculating(false);
      setShowResults(true);
    }, 1500);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
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
                        System Size (kWp)
                      </label>
                      <Input
                        id="systemSize"
                        type="number"
                        min="1"
                        step="0.1"
                        placeholder="e.g. 100"
                        value={systemSize}
                        onChange={(e) => setSystemSize(e.target.value)}
                        className="retro-input text-lg"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="commissioningDate" className="block text-sm font-medium text-crunch-black/70 mb-1">
                        Commissioning Date
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
                    
                    <Button 
                      onClick={handleCalculate}
                      disabled={isCalculating || !systemSize || parseFloat(systemSize) <= 0}
                      className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium text-lg py-6 rounded-xl group transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      {isCalculating ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                          Crunching...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          CRUNCH IT! 
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
                {!showResults ? (
                  <div className="meta-card p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-crunch-black mb-4">
                        See How Your Solar Stacks Up
                      </p>
                      <p className="text-crunch-black/70">
                        Enter your system details and hit "CRUNCH IT!" to discover your solar system's potential impact.
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
                ) : (
                  <CalculationResults 
                    results={results!} 
                    systemSize={parseFloat(systemSize)}
                    commissioningDate={new Date(commissioningDate)}
                    onReset={() => setShowResults(false)}
                    onSignUp={() => navigate("/register")}
                  />
                )}
              </motion.div>
            </div>
          </div>
        </section>
        
        <FeaturesSection />
        <CTASection navigate={navigate} />
      </main>
      
      <Footer />
    </div>
  );
};

interface IconCardProps {
  icon: React.FC<LucideProps>;
  title: string;
  description: string;
}

const IconCard = ({ icon: Icon, title, description }: IconCardProps) => {
  return (
    <div className="bg-white/50 p-4 rounded-xl shadow-sm border border-crunch-black/5 hover:shadow-md transition-all hover:-translate-y-1 text-center">
      <div className="bg-crunch-yellow/10 w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-crunch-yellow" />
      </div>
      <h3 className="font-medium text-crunch-black">{title}</h3>
      <p className="text-xs text-crunch-black/60">{description}</p>
    </div>
  );
};

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-white to-crunch-yellow/5 py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-block px-4 py-2 bg-white/70 backdrop-blur-md rounded-full shadow-md border border-white/40 shadow-black/30 mb-6">
            <span className="text-sm font-medium text-crunch-black/70">Interactive Estimator</span>
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black leading-tight tracking-tight mb-6">
            Crunch Carbon's <span className="text-crunch-yellow drop-shadow-sm">Carbon Credit Calculator</span>
          </h1>
          
          <p className="text-xl text-crunch-black/80 mb-10">
            Discover how much your solar installation could earn in carbon credits. Enter your system details and we'll show you the impact and potential value.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

interface CalculationResults {
  annualGeneration: number;
  coalAvoided: number;
  carbonOffset: number;
  carbonCredits: number;
  yearsData: YearData[];
}

interface YearData {
  year: number;
  generation: number;
  carbonOffset: number;
  carbonCredits: number;
}

interface CalculationResultsProps {
  results: CalculationResults;
  systemSize: number;
  commissioningDate: Date;
  onReset: () => void;
  onSignUp: () => void;
}

const CalculationResults = ({ 
  results, 
  systemSize,
  commissioningDate,
  onReset,
  onSignUp
}: CalculationResultsProps) => {
  return (
    <div className="meta-card p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-crunch-black">
        Your Solar Impact
      </h2>
      
      <div className="mb-6 p-4 bg-white/50 rounded-xl border border-crunch-black/10">
        <h3 className="text-sm font-medium text-crunch-black/70 mb-2">System Details</h3>
        <div className="flex justify-between">
          <p className="text-crunch-black font-medium">
            {systemSize} kWp Solar System
          </p>
          <p className="text-crunch-black/70 flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            Commissioned: {format(commissioningDate, "dd MMM yyyy")}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ResultCard 
          title="Annual Energy" 
          value={formatNumber(results.annualGeneration)} 
          unit="kWh"
          description={`You'll generate approximately ${formatNumber(results.annualGeneration)} kWh of clean energy annually.`}
        />
        
        <ResultCard 
          title="Coal Avoided" 
          value={formatNumber(results.coalAvoided)} 
          unit="kg"
          description={`You've saved the planet from burning ${formatNumber(results.coalAvoided)} kg of coal!`}
        />
        
        <ResultCard 
          title="Carbon Impact" 
          value={formatNumber(results.carbonOffset)} 
          unit="tonnes CO₂"
          description={`That's like planting ${formatNumber(results.carbonOffset * 50)} trees!`}
        />
      </div>
      
      <div className="relative mb-8 overflow-hidden rounded-xl border border-crunch-black/10">
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-transparent via-transparent to-white/70"></div>
        <div className="bg-white/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-crunch-black/70 mb-2">Estimated Carbon Credits</h3>
          <p className="text-2xl font-bold text-crunch-black mb-2">
            {formatNumber(results.carbonCredits)} <span className="text-sm font-normal">credits per year</span>
          </p>
          
          <div className="relative">
            <table className="w-full text-sm mt-4">
              <thead className="text-crunch-black/70 text-xs">
                <tr>
                  <th className="text-left pb-2">Year</th>
                  <th className="text-right pb-2">Energy (kWh)</th>
                  <th className="text-right pb-2">Carbon Offset (tonnes)</th>
                  <th className="text-right pb-2">Carbon Credits</th>
                </tr>
              </thead>
              <tbody>
                {results.yearsData.slice(0, 4).map((year) => (
                  <tr key={year.year} className="border-t border-crunch-black/5">
                    <td className="py-2 text-left font-medium">{year.year}</td>
                    <td className="py-2 text-right">{formatNumber(year.generation)}</td>
                    <td className="py-2 text-right">{formatNumber(year.carbonOffset)}</td>
                    <td className="py-2 text-right">{formatNumber(year.carbonCredits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent h-24 backdrop-blur-sm flex items-end justify-center p-4 z-20">
          <div className="text-center">
            <p className="font-medium text-crunch-black mb-3">
              💰 Want to see what that's worth?
            </p>
            <Button 
              onClick={onSignUp}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium px-6"
            >
              Sign up to reveal your potential earnings
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-crunch-black/70">
              See Full Forecast (2025-2030)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Your Full Carbon Credit Forecast</DialogTitle>
              <DialogDescription>
                Projected credits from {format(commissioningDate, "dd MMM yyyy")} to 2030
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-crunch-black/70 text-xs">
                  <tr>
                    <th className="text-left p-2">Year</th>
                    <th className="text-right p-2">Energy (kWh)</th>
                    <th className="text-right p-2">Carbon Offset (tonnes)</th>
                    <th className="text-right p-2">Carbon Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {results.yearsData.map((year) => (
                    <tr key={year.year} className="border-t border-crunch-black/5">
                      <td className="p-2 text-left font-medium">{year.year}</td>
                      <td className="p-2 text-right">{formatNumber(year.generation)}</td>
                      <td className="p-2 text-right">{formatNumber(year.carbonOffset)}</td>
                      <td className="p-2 text-right">{formatNumber(year.carbonCredits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <DialogFooter className="pt-4 border-t border-crunch-black/10">
              <p className="text-xs text-crunch-black/60 italic mr-auto">
                * Estimates are based on current carbon emission factors and may vary.
              </p>
              <Button
                onClick={onSignUp}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
              >
                Sign Up to Reveal Value
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="ghost" 
          onClick={onReset}
          className="ml-2 text-crunch-black/70"
        >
          Reset Calculator
        </Button>
      </div>
    </div>
  );
};

interface ResultCardProps {
  title: string;
  value: string;
  unit: string;
  description: string;
}

const ResultCard = ({ title, value, unit, description }: ResultCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 p-4 rounded-xl border border-crunch-black/10 hover:shadow-md transition-all hover:-translate-y-1"
    >
      <h3 className="text-sm font-medium text-crunch-black/70 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-crunch-black mb-1">
        {value} <span className="text-sm font-normal">{unit}</span>
      </p>
      <p className="text-xs text-crunch-black/60">{description}</p>
    </motion.div>
  );
};

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-crunch-yellow/5 to-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-crunch-black mb-4">
            Why Calculate Your Carbon Impact?
          </h2>
          <p className="text-lg text-crunch-black/70 max-w-2xl mx-auto">
            Understanding your solar system's environmental benefits is just the first step toward unlocking its full value.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            title="Quantify Your Impact" 
            description="Visualize exactly how much carbon you're preventing from entering the atmosphere with your solar installation."
            icon={BarChart3}
          />
          
          <FeatureCard 
            title="Discover Credit Potential" 
            description="Learn how your clean energy generation can be converted into valuable carbon credits that you can monetize."
            icon={TreePine}
          />
          
          <FeatureCard 
            title="Unlock New Revenue" 
            description="Your solar system isn't just saving you money on electricity—it could be generating an additional income stream."
            icon={CircleDollarSign}
          />
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.FC<LucideProps>;
}

const FeatureCard = ({ title, description, icon: Icon }: FeatureCardProps) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-xl shadow-sm border border-crunch-black/5 transition-all hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-full bg-crunch-yellow/20 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-crunch-yellow" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-crunch-black">{title}</h3>
      <p className="text-crunch-black/70">{description}</p>
    </motion.div>
  );
};

const CTASection = ({ navigate }: { navigate: (path: string) => void }) => {
  return (
    <section className="py-16 bg-gradient-to-br from-crunch-yellow/20 to-crunch-yellow/5">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-crunch-black">
            Ready to Turn Your Solar Power Into Profit?
          </h2>
          <p className="text-xl text-crunch-black/80 mb-10 max-w-2xl mx-auto">
            Don't leave money on the table. Sign up now to unlock the full potential of your solar system and start earning from your carbon credits.
          </p>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Button 
              onClick={() => navigate("/register")}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black px-8 py-6 text-lg rounded-xl group"
              size="lg"
            >
              Get Started Now <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Helper functions
const calculateResults = (systemSize: number, commissioningDate: Date): CalculationResults => {
  const dailyGeneration = systemSize * 4.5; // kWh per day
  const yearStart = new Date(commissioningDate.getFullYear(), 0, 1);
  const yearEnd = new Date(commissioningDate.getFullYear(), 11, 31);
  
  // Calculate days in the first year (for prorated calculation)
  const daysInFirstYear = Math.max(1, Math.floor((yearEnd.getTime() - commissioningDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysInYear = 365;
  
  // Calculate first year's generation (prorated)
  const firstYearGeneration = dailyGeneration * daysInFirstYear;
  
  // Calculate full year generation
  const fullYearGeneration = dailyGeneration * daysInYear;
  
  // Carbon emission factor: 1.033 kg CO₂ per kWh
  const emissionFactor = 1.033;
  
  // Calculate yearly data from commissioning to 2030
  const yearsData: YearData[] = [];
  const startYear = commissioningDate.getFullYear();
  const endYear = 2030;
  
  for (let year = startYear; year <= endYear; year++) {
    const isFirstYear = year === startYear;
    const yearGeneration = isFirstYear ? firstYearGeneration : fullYearGeneration;
    const yearCarbonOffset = (yearGeneration * emissionFactor) / 1000; // Convert kg to tonnes
    const yearCarbonCredits = Math.floor(yearCarbonOffset); // 1 credit = 1 tonne
    
    yearsData.push({
      year,
      generation: yearGeneration,
      carbonOffset: yearCarbonOffset,
      carbonCredits: yearCarbonCredits
    });
  }
  
  // Coal calculation: 1 kWh of electricity ≈ 0.33 kg of coal
  const coalFactor = 0.33;
  const totalCoalAvoided = fullYearGeneration * coalFactor;
  
  return {
    annualGeneration: fullYearGeneration,
    coalAvoided: totalCoalAvoided,
    carbonOffset: (fullYearGeneration * emissionFactor) / 1000, // Convert kg to tonnes
    carbonCredits: Math.floor((fullYearGeneration * emissionFactor) / 1000), // 1 credit = 1 tonne
    yearsData
  };
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toFixed(1);
  }
};

export default Calculator;
