
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <header className="backdrop-blur-md bg-white/90 border-b border-crunch-black/5 sticky top-0 z-50 shadow-sm">
      <div className="grid-container py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-full hover:bg-crunch-black/5 focus:outline-none focus:ring-2 focus:ring-crunch-yellow transition-all duration-300"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <motion.a 
            href="/" 
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img 
              src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" 
              alt="CrunchCarbon Logo" 
              className="h-12 drop-shadow-sm" 
            />
          </motion.a>
        </div>
        
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <HoverCard key={item.href} openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <motion.a 
                  href={item.href} 
                  className="font-medium text-crunch-black relative group"
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow rounded-full transition-all duration-300 group-hover:w-full"></span>
                </motion.a>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-2 shadow-lg backdrop-blur-lg bg-white/95 border border-crunch-black/5">
                <span className="text-xs font-medium text-crunch-black/70">{item.description}</span>
              </HoverCardContent>
            </HoverCard>
          ))}
        </nav>
        
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex text-crunch-black hover:text-crunch-black hover:bg-crunch-yellow/10 rounded-full px-5"
            >
              Log in
            </Button>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              onClick={() => navigate("/register")}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium rounded-full px-5 shadow-sm hover:shadow transition-all"
            >
              Sign up
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <motion.div 
        className={cn(
          "lg:hidden fixed inset-0 bg-white/95 backdrop-blur-lg z-40 pt-20 px-6",
          menuOpen ? "block" : "hidden"
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ 
          opacity: menuOpen ? 1 : 0,
          y: menuOpen ? 0 : -10
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <nav className="flex flex-col gap-6">
          {navItems.map((item) => (
            <motion.a 
              key={item.href}
              href={item.href} 
              className="py-3 border-b border-crunch-black/5 font-medium text-crunch-black"
              onClick={() => setMenuOpen(false)}
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {item.label}
              <div className="text-xs text-crunch-black/60 mt-1">{item.description}</div>
            </motion.a>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                navigate("/login");
                setMenuOpen(false);
              }}
              className="w-full border border-crunch-black/10 rounded-full"
            >
              Log in
            </Button>
            <Button 
              onClick={() => {
                navigate("/register");
                setMenuOpen(false);
              }}
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black rounded-full"
            >
              Sign up
            </Button>
          </div>
        </nav>
      </motion.div>
    </header>
  );
}

const navItems = [
  { 
    label: "Home", 
    href: "/",
    description: "Return to our homepage" 
  },
  { 
    label: "How It Works", 
    href: "/#how-it-works",
    description: "Learn about our process" 
  },
  { 
    label: "Calculator", 
    href: "/calculator",
    description: "Calculate your potential earnings" 
  },
  { 
    label: "For Agents", 
    href: "/agents",
    description: "Information for energy consultants" 
  },
  { 
    label: "About", 
    href: "/about",
    description: "Learn more about CrunchCarbon" 
  },
  { 
    label: "Contact", 
    href: "/contact",
    description: "Get in touch with us" 
  },
];
