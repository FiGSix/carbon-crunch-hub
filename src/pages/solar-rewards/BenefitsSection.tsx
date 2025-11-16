import { Check } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      title: "Free to Join",
      description: "No signup fees. No audit fees. No hidden costs."
    },
    {
      title: "Passive Income From Your Solar",
      description: "We sell your credits and deposit your share directly."
    },
    {
      title: "Fully Managed Audits & Verification",
      description: "Handled by independent, accredited auditors so everything is legitimate and internationally recognised."
    },
    {
      title: "Track Your Earnings",
      description: "Get a monthly breakdown of your energy impact and credit value."
    },
    {
      title: "Boost Your Home's Green Credentials",
      description: "Own official carbon credit statements you can show to insurers, banks, or body corporates."
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
          What You Get as a Homeowner
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
