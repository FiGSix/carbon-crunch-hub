
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useIsMobile, useIsTouch } from "@/hooks/use-mobile";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  
  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile && menuOpen) {
      setMenuOpen(false);
    }
  }, [isMobile, menuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);
  
  return (
    <>
      <header className="backdrop-blur-md bg-white/90 border-b border-crunch-black/5 sticky top-0 z-50 shadow-sm">
        <div className="grid-container py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-crunch-black/5 focus:outline-none focus:ring-2 focus:ring-crunch-yellow transition-all duration-300 touch-manipulation"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            
            <motion.a 
              href="/" 
              className="flex items-center touch-manipulation"
              whileHover={!isTouch ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <img 
                src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" 
                alt="CrunchCarbon Logo" 
                className="h-10 md:h-12 drop-shadow-sm" 
              />
            </motion.a>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navItems.map((item) => (
              !isTouch ? (
                <HoverCard key={item.href} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <motion.a 
                      href={item.href} 
                      className="font-medium text-crunch-black relative group py-2 px-1"
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
              ) : (
                <a 
                  key={item.href}
                  href={item.href} 
                  className="font-medium text-crunch-black relative group py-2 px-1 touch-manipulation"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow rounded-full transition-all duration-300 group-hover:w-full"></span>
                </a>
              )
            ))}
          </nav>
          
          <div className="flex items-center gap-2 md:gap-3">
            <motion.div 
              whileHover={!isTouch ? { scale: 1.03 } : {}} 
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex text-crunch-black hover:text-crunch-black hover:bg-crunch-yellow/10 rounded-full px-4 md:px-5 py-2 min-h-[44px] touch-manipulation"
              >
                Log in
              </Button>
            </motion.div>
            <motion.div 
              whileHover={!isTouch ? { scale: 1.03 } : {}} 
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button 
                onClick={() => navigate("/register")}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium rounded-full px-4 md:px-5 py-2 shadow-sm hover:shadow transition-all min-h-[44px] touch-manipulation"
              >
                Sign up
              </Button>
            </motion.div>
          </div>
        </div>
      </header>
      
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            className="lg:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="p-6 pt-20">
              <nav className="flex flex-col gap-2">
                {navItems.map((item, index) => (
                  <motion.a 
                    key={item.href}
                    href={item.href} 
                    className="py-4 px-4 border-b border-crunch-black/5 font-medium text-crunch-black rounded-lg hover:bg-crunch-yellow/10 transition-colors touch-manipulation"
                    onClick={() => setMenuOpen(false)}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex flex-col">
                      <span className="text-base font-medium">{item.label}</span>
                      <span className="text-xs text-crunch-black/60 mt-1">{item.description}</span>
                    </div>
                  </motion.a>
                ))}
                
                <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-crunch-black/5">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: navItems.length * 0.05 }}
                  >
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigate("/login");
                        setMenuOpen(false);
                      }}
                      className="w-full border border-crunch-black/10 rounded-full py-3 min-h-[44px] touch-manipulation"
                    >
                      Log in
                    </Button>
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: (navItems.length + 1) * 0.05 }}
                  >
                    <Button 
                      onClick={() => {
                        navigate("/register");
                        setMenuOpen(false);
                      }}
                      className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black rounded-full py-3 min-h-[44px] touch-manipulation"
                    >
                      Sign up
                    </Button>
                  </motion.div>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
