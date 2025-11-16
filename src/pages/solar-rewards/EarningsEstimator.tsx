import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

interface EarningsEstimatorProps {
  onCalculateClick: () => void;
}

export function EarningsEstimator({ onCalculateClick }: EarningsEstimatorProps) {
  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-accent/50 to-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6">
            How Much Can I Earn?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            Every home is different — but most clients earn annual payouts based on the size and output of their system.
          </p>
          
          <p className="text-muted-foreground mb-8">
            Use our calculator to see your estimated earnings.
          </p>
          
          <Button 
            size="lg"
            onClick={onCalculateClick}
            className="h-14 px-10 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Calculate My Solar Credit Value
          </Button>
        </div>
      </div>
    </section>
  );
}
