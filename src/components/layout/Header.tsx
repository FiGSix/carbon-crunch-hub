
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <header className="bg-white border-b border-crunch-black/5 sticky top-0 z-50">
      <div className="grid-container py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-crunch-black/5"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <a href="/" className="flex items-center gap-2">
            <img src="/lovable-uploads/850f8914-10c9-4eca-91e0-471bca63f70a.png" alt="CrunchCarbon Logo" className="h-10" />
            <span className="text-xl font-bold uppercase text-crunch-black">CRUNCH CARBON</span>
          </a>
        </div>
        
        <nav className="hidden lg:flex items-center gap-8">
          <a href="/dashboard" className="font-medium text-crunch-black hover:text-crunch-yellow transition-colors">
            Dashboard
          </a>
          <a href="/proposals" className="font-medium text-crunch-black hover:text-crunch-yellow transition-colors">
            Proposals
          </a>
          <a href="/calculator" className="font-medium text-crunch-black hover:text-crunch-yellow transition-colors">
            Calculator
          </a>
          <a href="/about" className="font-medium text-crunch-black hover:text-crunch-yellow transition-colors">
            About
          </a>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/login")}
            className="hidden sm:inline-flex text-crunch-black hover:text-crunch-black hover:bg-crunch-yellow/10"
          >
            Log in
          </Button>
          <Button 
            onClick={() => navigate("/register")}
            className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium"
          >
            Sign up
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={cn(
        "lg:hidden fixed inset-0 bg-white z-40 pt-20 px-6 transition-transform duration-300 ease-in-out",
        menuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="flex flex-col gap-6">
          <a 
            href="/dashboard" 
            className="py-3 border-b border-crunch-black/10 font-medium text-crunch-black"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </a>
          <a 
            href="/proposals" 
            className="py-3 border-b border-crunch-black/10 font-medium text-crunch-black"
            onClick={() => setMenuOpen(false)}
          >
            Proposals
          </a>
          <a 
            href="/calculator" 
            className="py-3 border-b border-crunch-black/10 font-medium text-crunch-black"
            onClick={() => setMenuOpen(false)}
          >
            Calculator
          </a>
          <a 
            href="/about" 
            className="py-3 border-b border-crunch-black/10 font-medium text-crunch-black"
            onClick={() => setMenuOpen(false)}
          >
            About
          </a>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                navigate("/login");
                setMenuOpen(false);
              }}
              className="w-full border-crunch-black/10"
            >
              Log in
            </Button>
            <Button 
              onClick={() => {
                navigate("/register");
                setMenuOpen(false);
              }}
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
            >
              Sign up
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
