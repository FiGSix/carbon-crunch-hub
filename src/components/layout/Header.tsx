
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <header className="bg-white border-b border-crunch-black/5 sticky top-0 z-50">
      <div className="grid-container py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-crunch-black/5 focus:outline-none focus:ring-2 focus:ring-crunch-yellow transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <motion.a 
            href="/" 
            className="flex items-center"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <img 
              src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" 
              alt="CrunchCarbon Logo" 
              className="h-12" 
            />
          </motion.a>
        </div>
        
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <motion.a 
              key={item.href}
              href={item.href} 
              className="font-medium text-crunch-black relative group"
              whileHover={{ scale: 1.05 }}
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
            </motion.a>
          ))}
        </nav>
        
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex text-crunch-black hover:text-crunch-black hover:bg-crunch-yellow/10"
            >
              Log in
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => navigate("/register")}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium shadow-sm hover:shadow transition-all"
            >
              Sign up
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <motion.div 
        className={cn(
          "lg:hidden fixed inset-0 bg-white z-40 pt-20 px-6",
          menuOpen ? "block" : "hidden"
        )}
        initial={{ x: "-100%" }}
        animate={{ x: menuOpen ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <nav className="flex flex-col gap-6">
          {navItems.map((item) => (
            <a 
              key={item.href}
              href={item.href} 
              className="py-3 border-b border-crunch-black/10 font-medium text-crunch-black"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
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
      </motion.div>
    </header>
  );
}

const navItems = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Calculator", href: "/calculator" },
  { label: "For Agents", href: "/agents" },
  { label: "About", href: "/about" },
];
