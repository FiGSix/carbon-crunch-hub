import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useIsMobile } from "@/hooks/use-mobile";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
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
      <header 
        className="backdrop-blur-md bg-white/90 border-b border-crunch-black/5 sticky top-0 z-50 shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderBottom: '1px solid rgba(26, 26, 26, 0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div 
          className="container-responsive py-3 md:py-4 flex items-center justify-content-between"
          style={{
            maxWidth: '80rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-crunch-black/5 focus:outline-none focus:ring-2 focus:ring-crunch-yellow transition-all duration-300 touch-manipulation"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <SafeMotionDiv
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link 
                to="/" 
                className="flex items-center touch-manipulation hover:opacity-90 transition-opacity duration-200"
              >
                <OptimizedImage
                  src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png"
                  alt="CrunchCarbon Logo"
                  className="h-10 md:h-12 drop-shadow-sm"
                  width={141}
                  height={48}
                  priority={true}
                  fetchPriority="high"
                  sizes="(max-width: 768px) 141px, 141px"
                />
              </Link>
            </SafeMotionDiv>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                to={item.href} 
                className="font-medium text-crunch-black relative group py-2 px-1 touch-manipulation hover:text-crunch-yellow transition-colors duration-200"
                title={item.description}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow rounded-full transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2 md:gap-3">
            <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex text-crunch-black hover:text-crunch-black hover:bg-crunch-yellow/10 rounded-full px-4 md:px-5 py-2 min-h-[44px] touch-manipulation"
              >
                Log in
              </Button>
            </SafeMotionDiv>
            <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium rounded-full px-4 md:px-5 py-2 shadow-sm hover:shadow transition-all min-h-[44px] touch-manipulation"
              >
                Sign up
              </Button>
            </SafeMotionDiv>
          </div>
        </div>
      </header>
      
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          style={{
            opacity: 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
        />
      )}
      
      {/* Mobile menu */}
      {menuOpen && (
        <SafeMotionDiv 
          className={cn(
            "lg:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="p-6 pt-20">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  to={item.href} 
                  className="py-4 px-4 border-b border-crunch-black/5 font-medium text-crunch-black rounded-lg hover:bg-crunch-yellow/10 transition-colors touch-manipulation"
                  onClick={() => setMenuOpen(false)}
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{item.label}</span>
                    <span className="text-xs text-crunch-black/60 mt-1">{item.description}</span>
                  </div>
                </Link>
              ))}
              
              <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-crunch-black/5">
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
                <Button 
                  onClick={() => {
                    navigate("/register");
                    setMenuOpen(false);
                  }}
                  className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black rounded-full py-3 min-h-[44px] touch-manipulation"
                >
                  Sign up
                </Button>
              </div>
            </nav>
          </div>
            </SafeMotionDiv>
      )}
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
    label: "For Homeowners", 
    href: "/home-owners",
    description: "Monetize your solar system" 
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
    label: "Why Choose Us", 
    href: "/why-choose-us",
    description: "The right carbon partner" 
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
  { 
    label: "Got Game?", 
    href: "/game",
    description: "Play our interactive game" 
  },
];
