import { Button } from "@/components/ui/button";
import { DollarSign, Heart, GraduationCap, Sprout, Zap, Bot } from "lucide-react";

export function ValueCards() {
  const cards = [
    {
      icon: DollarSign,
      title: "Get Paid in Cash",
      description: "Annual payouts deposited directly to your account",
      link: "#",
      isExternal: false
    },
    {
      icon: Heart,
      title: "Qhubeka",
      description: "Donate credits to provide bicycles for students",
      link: "https://www.qhubeka.org/",
      isExternal: true
    },
    {
      icon: GraduationCap,
      title: "Help a Child",
      description: "Fund education for underprivileged children",
      link: "https://helpachild.org.za/",
      isExternal: true
    },
    {
      icon: Sprout,
      title: "Bokamoso Trust",
      description: "Invest in youth development programmes",
      link: "https://bokamosotrust.org.za/",
      isExternal: true
    },
    {
      icon: Zap,
      title: "PVBiz",
      description: "Trade credits for solar maintenance & upgrades",
      link: "#",
      isExternal: false
    },
    {
      icon: Bot,
      title: "Aruna AI",
      description: "Get smart energy monitoring & optimization",
      link: "#",
      isExternal: false
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-4">
          Choose How You Want to Benefit
        </h2>
        
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Turn your solar credits into cash, donate to charity, or exchange for services
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {cards.map((card, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent mb-4">
                <card.icon className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2">
                {card.title}
              </h3>
              
              <p className="text-muted-foreground mb-6 flex-grow">
                {card.description}
              </p>
              
              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <a 
                  href={card.link} 
                  target={card.isExternal ? "_blank" : undefined}
                  rel={card.isExternal ? "noopener noreferrer" : undefined}
                >
                  {index === 0 ? "Learn More" : `Support ${card.title}`}
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
