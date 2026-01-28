import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import ghostImage from "@/assets/404-ghost.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: '#FFCD03' }}
    >
      {/* Content container with generous spacing */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 md:space-y-8">
        
        {/* Headline */}
        <h1 
          className="text-2xl md:text-3xl lg:text-4xl leading-tight tracking-tight"
          style={{ 
            fontFamily: "'Press Start 2P', monospace",
            color: '#0B0B0B'
          }}
        >
          404 - Nothing to crunch here
        </h1>

        {/* Sub-headline */}
        <p 
          className="text-lg md:text-xl lg:text-2xl font-medium"
          style={{ 
            fontFamily: "'Press Start 2P', monospace",
            color: '#0B0B0B',
            lineHeight: '1.6'
          }}
        >
          The credits you're looking for aren't here, sadly.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col items-center space-y-4 pt-4">
          {/* Primary CTA */}
          <Button
            asChild
            className="px-8 py-6 text-base font-bold rounded-xl transition-all hover:scale-105 hover:shadow-lg"
            style={{ 
              backgroundColor: '#0B0B0B',
              color: '#FFCD03'
            }}
          >
            <Link to="/">Back to Home</Link>
          </Button>

        </div>
      </div>

      {/* Ghost image - centered at bottom */}
      <div className="mt-12 md:mt-16">
        <img 
          src={ghostImage} 
          alt="Pixel art ghost illustration"
          className="w-48 md:w-72 lg:w-96 h-auto object-contain"
        />
      </div>
    </div>
  );
};

export default NotFound;
