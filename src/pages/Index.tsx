
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, BarChart3, CheckCircle2, Leaf, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-white to-crunch-yellow/5 py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-block px-4 py-2 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white/40"
                >
                  <span className="text-sm font-medium text-crunch-black/70">Renewable Energy Monetization</span>
                </motion.div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black leading-tight tracking-tight">
                  <span className="block">Carbon Made Simple</span>
                  <span className="text-crunch-yellow drop-shadow-sm">Unlock Hidden Value</span>
                </h1>
                
                <p className="text-xl text-crunch-black/70 max-w-xl">
                  Transform your solar system into a powerful income stream with carbon credits. Simple setup. Real results.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={() => navigate("/register")}
                      className="bg-crunch-yellow text-crunch-black hover:bg-crunch-yellow/90 text-lg py-6 px-8 w-full sm:w-auto rounded-2xl shadow-sm hover:shadow-lg group transition-all duration-300"
                      size="lg"
                    >
                      <span>Get Started</span> 
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant="glass" 
                      onClick={() => navigate("/calculator")}
                      className="text-crunch-black text-lg py-6 px-8 w-full sm:w-auto rounded-2xl transition-all duration-300"
                      size="lg"
                    >
                      Calculate Your Potential
                    </Button>
                  </motion.div>
                </div>
                
                <div className="flex items-center text-crunch-black/70 pt-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  <span className="text-sm">Setup in under 10 minutes. First results in 30 days.</span>
                </div>
              </motion.div>
              
              <motion.div 
                className="hidden lg:block relative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="relative">
                  <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full rounded-3xl bg-gradient-to-br from-crunch-yellow/30 to-crunch-yellow/10"></div>
                  <div className="meta-card rounded-3xl p-6">
                    <img 
                      src="/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634.png" 
                      alt="CrunchCarbon Pac-Man Style Logo" 
                      className="w-full h-auto rounded-2xl transition-all hover:scale-105 duration-500"
                    />
                  </div>
                  
                  {/* Floating elements */}
                  <motion.div 
                    className="absolute -top-10 -left-10 meta-card p-3 rounded-2xl flex items-center gap-2"
                    animate={{ 
                      y: [0, -10, 0],
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut" 
                    }}
                  >
                    <Shield className="text-green-500 h-6 w-6" />
                    <span className="font-medium text-crunch-black">Verified Green</span>
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-5 -left-20 meta-card p-3 rounded-2xl flex items-center gap-2"
                    animate={{ 
                      y: [0, 10, 0],
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 5,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  >
                    <Zap className="text-crunch-yellow h-6 w-6" />
                    <span className="font-medium text-crunch-black">Energy → Revenue</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Social Proof */}
        <section className="border-y border-crunch-black/10 bg-crunch-black/5 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-center">
              <p className="text-crunch-black/80 font-medium">Trusted by homeowners across the country</p>
              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <motion.div 
                    className="text-2xl font-bold text-crunch-black"
                    whileHover={{ scale: 1.1 }}
                  >
                    3,500+
                  </motion.div>
                  <div className="text-sm text-crunch-black/70">Solar systems</div>
                </div>
                <div className="text-center">
                  <motion.div 
                    className="text-2xl font-bold text-crunch-black"
                    whileHover={{ scale: 1.1 }}
                  >
                    $1.2M+
                  </motion.div>
                  <div className="text-sm text-crunch-black/70">Revenue generated</div>
                </div>
                <div className="text-center">
                  <motion.div 
                    className="text-2xl font-bold text-crunch-black"
                    whileHover={{ scale: 1.1 }}
                  >
                    28,000+
                  </motion.div>
                  <div className="text-sm text-crunch-black/70">Tons CO₂ offset</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-crunch-black">
                  Turn Your Energy Into Income
                </h2>
                <p className="text-xl text-crunch-black/70 max-w-3xl mx-auto">
                  Our platform automates everything, so you can sit back and watch your green energy create green dollars.
                </p>
              </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
                  <div className="rounded-full bg-green-100 p-4 inline-block mb-6 group-hover:bg-green-200 transition-colors">
                    <Leaf className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-crunch-black">
                    1. Quick Registration
                  </h3>
                  <p className="text-crunch-black/70">
                    Answer a few questions about your renewable energy system. We'll verify its eligibility in minutes, not weeks.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
                  <div className="rounded-full bg-blue-100 p-4 inline-block mb-6 group-hover:bg-blue-200 transition-colors">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-crunch-black">
                    2. Automatic Tracking
                  </h3>
                  <p className="text-crunch-black/70">
                    Our system monitors your energy production and automatically converts it into verified carbon credits.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -5 }}
              >
                <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
                  <div className="rounded-full bg-yellow-100 p-4 inline-block mb-6 group-hover:bg-yellow-200 transition-colors">
                    <Zap className="h-8 w-8 text-crunch-yellow" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-crunch-black">
                    3. Regular Payouts
                  </h3>
                  <p className="text-crunch-black/70">
                    Receive quarterly deposits directly to your bank account. No hassle, no complicated paperwork, just income.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-20 bg-crunch-black/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-crunch-black">
                  What Our Users Are Saying
                </h2>
                <p className="text-xl text-crunch-black/70 max-w-3xl mx-auto">
                  Join thousands of system owners already monetizing their clean energy.
                </p>
              </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div 
                  key={index}
                  className="group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-crunch-yellow fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-crunch-black/80 mb-6 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-crunch-black/10 rounded-full flex items-center justify-center text-crunch-black font-bold mr-4">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-crunch-black">{testimonial.name}</h4>
                        <p className="text-sm text-crunch-black/70">{testimonial.location}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="meta-card rounded-3xl p-8 md:p-12 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-crunch-yellow/20 rounded-full -mr-32 -mt-32 z-0"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-crunch-yellow/10 rounded-full -ml-48 -mb-48 z-0"></div>
              
              <div className="relative z-10 max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-crunch-black">
                  Ready to Earn From Your Clean Energy?
                </h2>
                <p className="text-xl text-crunch-black/80 mb-8">
                  The average solar system owner earns an extra $400-$1,200 annually through our platform. Calculate your potential in seconds.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={() => navigate("/register")}
                      className="bg-crunch-black hover:bg-crunch-black/90 text-white text-lg py-6 px-8 w-full sm:w-auto rounded-2xl shadow-sm hover:shadow-lg group transition-all duration-300"
                      size="lg"
                    >
                      <span>Start Earning Now</span>
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant="glass" 
                      onClick={() => navigate("/calculator")}
                      className="text-crunch-black text-lg py-6 px-8 w-full sm:w-auto rounded-2xl transition-all duration-300"
                      size="lg"
                    >
                      Calculate Your Earnings
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

// Testimonial data
const testimonials = [
  {
    name: "Michael R.",
    location: "California",
    quote: "I've been earning an extra $840 annually from my 10kW solar system. The setup took less than 10 minutes and CrunchCarbon handled everything else."
  },
  {
    name: "Sarah T.",
    location: "Colorado",
    quote: "After 3 years of having solar panels, I finally found a way to make them even more valuable. The quarterly deposits feel like getting a bonus four times a year!"
  },
  {
    name: "David K.",
    location: "Texas",
    quote: "My first thought was 'this sounds too good to be true.' Six months and two payments later, I'm glad I took the leap. Incredibly simple process."
  }
];

export default Index;
