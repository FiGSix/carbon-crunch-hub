import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onCTAClick: () => void;
}

export function HeroSection({ onCTAClick }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-br from-accent via-background to-muted overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxYTFhMWEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bTAtOHYyaDJ2LTJoLTJ6bS0yIDJ2Mmgydi0yaC0yem00IDB2Mmgydi0yaC0yem0tNCAwdjJoMnYtMmgtMnptNCAwdjJoMnYtMmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
      
      <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Homeowners did you know? </span>
            <span className="text-crunch-yellow">Your solar system can earn you money.</span>
          </h1>
          
          <p className="text-xl font-bold text-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
            <span className="text-crunch-yellow font-semibold">Crunch Carbon</span> turns your clean energy into verified carbon credits, sell them and share the proceeds.
          </p>
          
          <Button 
            size="lg"
            onClick={onCTAClick}
            className="h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl font-semibold w-full md:w-auto shadow-lg hover:shadow-xl transition-all"
          >
            Get My Free Solar Credit Estimate
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            Takes 30 seconds. No costs. No commitments.
          </p>
        </div>
      </div>
    </section>
  );
}
