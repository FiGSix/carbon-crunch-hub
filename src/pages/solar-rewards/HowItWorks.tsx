import { Button } from "@/components/ui/button";
import { Sun, Wrench, DollarSign } from "lucide-react";

interface HowItWorksProps {
  onCheckEligibility: () => void;
}

export function HowItWorks({ onCheckEligibility }: HowItWorksProps) {
  const steps = [
    {
      icon: Sun,
      title: "You Make Clean Energy",
      description: "Your solar system reduces CO₂. Those reductions have real financial value called carbon credits."
    },
    {
      icon: Wrench,
      title: "We Handle Everything",
      description: "Crunch Carbon measures your solar impact, manages the audits, gets the credits issued, and sells them on your behalf. You do nothing. Zero admin."
    },
    {
      icon: DollarSign,
      title: "You Get Paid",
      description: "When the credits sell, you receive your share. It's passive income for doing… well, nothing extra."
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
          How It Works (Simple.)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-card p-6 md:p-8 rounded-2xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-accent mb-6 mx-auto">
                <step.icon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4 text-center">
                {index + 1}. {step.title}
              </h3>
              
              <p className="text-muted-foreground text-center leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button 
            size="lg"
            variant="outline"
            onClick={onCheckEligibility}
            className="h-12 px-8"
          >
            Check Your Eligibility
          </Button>
        </div>
      </div>
    </section>
  );
}
