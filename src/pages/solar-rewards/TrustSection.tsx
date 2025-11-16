import { Flag, Zap, Shield, BadgeCheck } from "lucide-react";

export function TrustSection() {
  const features = [
    {
      icon: Flag,
      title: "Made for South Africans",
      description: "We specialise in residential solar — not giant farms."
    },
    {
      icon: Zap,
      title: "Zero Admin",
      description: "We manage the process from start to finish."
    },
    {
      icon: Shield,
      title: "Trusted & Verified",
      description: "Independent audits, international standards, no shortcuts."
    },
    {
      icon: BadgeCheck,
      title: "You Keep the Majority",
      description: "Your system. Your credits. Your reward."
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
          Why Homeowners Choose Crunch Carbon
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-xl border border-border text-center hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent mb-4 mx-auto">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
