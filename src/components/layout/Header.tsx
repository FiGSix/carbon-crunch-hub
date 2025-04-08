
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <header className="bg-white border-b border-carbon-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-carbon-gray-100"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <a href="/" className="flex items-center gap-2">
            <div className="bg-carbon-green-500 text-white font-bold p-2 rounded-md">CC</div>
            <span className="text-xl font-bold text-carbon-gray-900">CrunchCarbon</span>
          </a>
        </div>
        
        <nav className="hidden lg:flex items-center gap-6">
          <a href="/dashboard" className="font-medium text-carbon-gray-700 hover:text-carbon-green-600">
            Dashboard
          </a>
          <a href="/proposals" className="font-medium text-carbon-gray-700 hover:text-carbon-green-600">
            Proposals
          </a>
          <a href="/calculator" className="font-medium text-carbon-gray-700 hover:text-carbon-green-600">
            Calculator
          </a>
          <a href="/about" className="font-medium text-carbon-gray-700 hover:text-carbon-green-600">
            About
          </a>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/login")}
            className="hidden sm:inline-flex text-carbon-gray-700 hover:text-carbon-green-600 hover:bg-carbon-green-50"
          >
            Log in
          </Button>
          <Button 
            onClick={() => navigate("/register")}
            className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
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
            className="py-3 border-b border-carbon-gray-100 font-medium text-carbon-gray-800"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </a>
          <a 
            href="/proposals" 
            className="py-3 border-b border-carbon-gray-100 font-medium text-carbon-gray-800"
            onClick={() => setMenuOpen(false)}
          >
            Proposals
          </a>
          <a 
            href="/calculator" 
            className="py-3 border-b border-carbon-gray-100 font-medium text-carbon-gray-800"
            onClick={() => setMenuOpen(false)}
          >
            Calculator
          </a>
          <a 
            href="/about" 
            className="py-3 border-b border-carbon-gray-100 font-medium text-carbon-gray-800"
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
              className="w-full"
            >
              Log in
            </Button>
            <Button 
              onClick={() => {
                navigate("/register");
                setMenuOpen(false);
              }}
              className="w-full bg-carbon-green-500 hover:bg-carbon-green-600"
            >
              Sign up
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
