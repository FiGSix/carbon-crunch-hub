
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
export const HeroSection = () => {
  const navigate = useNavigate();
  return <section className="bg-gradient-to-br from-white to-crunch-yellow/5 py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="space-y-8">
            <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.5,
            delay: 0.2
          }} className="inline-block px-4 py-2 bg-white/60 backdrop-blur-md rounded-full shadow-md border border-white/40 shadow-black/20">
              <span className="text-sm font-medium text-crunch-black/70">Renewable Energy Monetised</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black leading-tight tracking-tight">
              <span className="text-crunch-black">Carbon Made</span>{" "}
              <span className="text-crunch-yellow drop-shadow-sm">Simple</span>
            </h1>
            
            <p className="text-xl font-bold text-crunch-black max-w-xl">
              Your Launchpad for Lightning-Fast Carbon Proposals
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <motion.div whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }}>
                <Button onClick={() => navigate("/register")} className="bg-crunch-yellow text-crunch-black hover:bg-crunch-yellow/90 text-lg py-6 px-8 w-full sm:w-auto rounded-2xl shadow-sm hover:shadow-lg group transition-all duration-300" size="lg">
                  <span>Get Started</span> 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
              <motion.div whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }}>
                <Button variant="glass" onClick={() => navigate("/calculator")} className="text-crunch-black text-lg py-6 px-8 w-full sm:w-auto rounded-2xl transition-all duration-300" size="lg">
                  Calculate Your Potential
                </Button>
              </motion.div>
            </div>
            
            <div className="flex items-center text-crunch-black/70 pt-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <span className="text-sm">Setup in under 10 minutes. First results in 30 days.</span>
            </div>
          </motion.div>
          
          <motion.div className="hidden lg:block relative" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }}>
            <div className="relative">
              <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full rounded-3xl bg-gradient-to-br from-crunch-yellow/30 to-crunch-yellow/10"></div>
              <div className="meta-card rounded-3xl p-6">
                <img src="/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634.png" alt="CrunchCarbon Pac-Man Style Logo" className="w-full h-auto rounded-2xl transition-all hover:scale-105 duration-500" />
              </div>
              
              {/* Floating elements */}
              <motion.div className="absolute -top-10 -left-10 meta-card p-3 rounded-2xl flex items-center gap-2" animate={{
              y: [0, -10, 0]
            }} transition={{
              repeat: Infinity,
              duration: 4,
              ease: "easeInOut"
            }}>
                <Shield className="text-green-500 h-6 w-6" />
                <span className="font-medium text-crunch-black">Verified Green</span>
              </motion.div>
              <motion.div className="absolute -bottom-5 -left-20 meta-card p-3 rounded-2xl flex items-center gap-2" animate={{
              y: [0, 10, 0]
            }} transition={{
              repeat: Infinity,
              duration: 5,
              ease: "easeInOut",
              delay: 1
            }}>
                <Zap className="text-crunch-yellow h-6 w-6" />
                <span className="font-medium text-crunch-black">Energy → Revenue</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>;
};
