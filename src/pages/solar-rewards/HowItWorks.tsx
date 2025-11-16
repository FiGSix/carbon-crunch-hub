import { Button } from "@/components/ui/button";
import { Sun, FileCheck, Wrench, DollarSign } from "lucide-react";

interface HowItWorksProps {
  onCheckEligibility: () => void;
}

export function HowItWorks({ onCheckEligibility }: HowItWorksProps) {
  const steps = [
    {
      icon: Sun,
      title: "Got Solar",
      description: "You installed a solar system and am generating and using clean green energy. That means your solar system are reducing CO₂ every day. Those reductions have real financial value, Carbon Credits."
    },
    {
      icon: FileCheck,
      title: "Onboarding",
      description: "Once you sign up and shared your solar system details with us you sign the Cession Agreement. Signed up'd we get all the finer details of your system via the digital onboarding process."
    },
    {
      icon: Wrench,
      title: "We Handle Everything",
      description: "Crunch Carbon then measures your solar impact, manages the external independent audits, gets the credits issued, and sells them on your behalf. You do nothing. Zero admin."
    },
    {
      icon: DollarSign,
      title: "You Get Paid",
      description: "When the credits are sold, you receive your share. Annually. It's passive income for doing… well, nothing extra."
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-6">
          How It Works
        </h2>
        
        <p className="text-lg text-foreground/80 text-center max-w-4xl mx-auto mb-12 leading-relaxed">
          Your solar system is working harder for you than you think. As it creates clean energy, it also reduces CO₂ every day. A real, measurable climate benefit. And that benefit isn't just good for the world. It's worth money through something called carbon credits. Join us on the journey.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
        
        <div className="text-center mt-12 space-y-4">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verify that the project meets all eligibility criteria for carbon credits.
          </p>
          <Button 
            size="lg"
            onClick={onCheckEligibility}
            className="h-14 px-10 bg-crunch-yellow hover:bg-crunch-yellow/90 text-foreground font-semibold"
          >
            Check Your Eligibility
          </Button>
        </div>
      </div>
    </section>
  );
}
