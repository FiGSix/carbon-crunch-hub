import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, TrendingUp, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Earnings calculation constants
const EARNINGS_PER_KWP_LOW = 120; // R/kWp/year (conservative)
const EARNINGS_PER_KWP_HIGH = 200; // R/kWp/year (optimistic)

export function BusinessCalculator() {
  const navigate = useNavigate();
  const [systemSize, setSystemSize] = useState(200); // kWp

  const earningsLow = Math.round(systemSize * EARNINGS_PER_KWP_LOW);
  const earningsHigh = Math.round(systemSize * EARNINGS_PER_KWP_HIGH);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R${(value / 1000).toFixed(0)}k`;
    }
    return `R${value.toLocaleString()}`;
  };

  const formatSize = (kWp: number) => {
    if (kWp >= 1000) {
      return `${(kWp / 1000).toFixed(1)} MW`;
    }
    return `${kWp} kWp`;
  };

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Calculate Your Business Earnings
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See how much additional revenue your commercial solar system could generate through carbon credits.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/40 rounded-3xl p-6 md:p-10"
        >
          {/* System Size Selector */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <label className="text-foreground font-medium flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                System Size
              </label>
              <span className="text-2xl font-bold text-primary">
                {formatSize(systemSize)}
              </span>
            </div>
            <Slider
              value={[systemSize]}
              onValueChange={(value) => setSystemSize(value[0])}
              min={50}
              max={2000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>50 kWp</span>
              <span>500 kWp</span>
              <span>1 MW</span>
              <span>2 MW</span>
            </div>
          </div>

          {/* Earnings Display */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-muted-foreground font-medium">Estimated Annual Earnings</span>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-foreground">
                {formatCurrency(earningsLow)} - {formatCurrency(earningsHigh)}
              </p>
              <p className="text-muted-foreground mt-2">per year</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-background rounded-xl">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(earningsLow * 5)}</p>
              <p className="text-sm text-muted-foreground">5-Year Total (Low)</p>
            </div>
            <div className="text-center p-4 bg-background rounded-xl">
              <p className="text-2xl font-bold text-primary">{formatCurrency((earningsLow + earningsHigh) / 2 * 5)}</p>
              <p className="text-sm text-muted-foreground">5-Year Average</p>
            </div>
            <div className="text-center p-4 bg-background rounded-xl">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(earningsHigh * 5)}</p>
              <p className="text-sm text-muted-foreground">5-Year Total (High)</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8"
              onClick={() => navigate("/calculator")}
            >
              Tell Us About Your Solar System
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl px-8"
              onClick={() => navigate("/contact")}
            >
              Request Detailed Analysis
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            *Estimates based on current carbon credit prices and typical generation profiles. Actual earnings may vary based on location, system performance, and market conditions.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
