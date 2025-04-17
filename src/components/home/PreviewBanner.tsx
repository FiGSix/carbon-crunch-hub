
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth";

export function PreviewBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <motion.div 
      className="bg-gradient-to-r from-crunch-black to-crunch-black/90 text-white py-3 px-4 rounded-lg mb-8 mt-4 max-w-5xl mx-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-crunch-yellow mr-2 animate-pulse" />
          <p className="text-sm">
            <span className="font-bold">New Dashboard Preview</span> - Check out our modern UI redesign!
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-crunch-yellow text-crunch-black hover:bg-crunch-yellow/90 border-none"
          onClick={() => navigate('/dashboard-preview')}
        >
          View Preview <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
