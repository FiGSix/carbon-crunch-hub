import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const EmbeddedGame = () => {
  return (
    <div className="w-full h-screen overflow-hidden bg-background relative">
      <Link to="/" className="absolute top-4 left-4 z-50">
        <Button 
          variant="secondary" 
          className="bg-white/90 hover:bg-white shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </Link>
      
      <iframe 
        src="https://crunching-carbon.lovable.app" 
        className="w-full h-full border-0"
        style={{
          borderRadius: '8px',
          display: 'block',
          width: '100%',
          height: '100vh',
          border: 'none'
        }}
        title="Embedded Game"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default EmbeddedGame;
