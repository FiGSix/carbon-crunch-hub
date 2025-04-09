
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, BarChart3, CheckCircle2, Leaf, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-carbon-green-50 to-carbon-blue-50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-carbon-gray-900">
                  Carbon Made Simple
                </h1>
                <p className="text-xl md:text-2xl text-carbon-gray-700 mb-8">
                  Generate carbon credits from your renewable energy system and maximize your revenue with CrunchCarbon's streamlined platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => navigate("/register")}
                    className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button text-lg py-6 px-8"
                    size="lg"
                  >
                    Get Started <ArrowRight className="ml-2" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/calculator")}
                    className="border-2 border-carbon-gray-200 text-carbon-gray-700 hover:bg-carbon-gray-50 retro-button text-lg py-6 px-8"
                    size="lg"
                  >
                    Calculate Credits
                  </Button>
                </div>
                <div className="mt-8 flex items-center text-carbon-gray-600">
                  <CheckCircle2 className="h-5 w-5 text-carbon-green-500 mr-2" />
                  <span>No registration fees. Get started in minutes.</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="retro-card bg-white relative z-10">
                  <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full bg-carbon-green-500 rounded-lg"></div>
                  <img 
                    src="/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634.png" 
                    alt="CrunchCarbon Pac-Man Style Logo" 
                    className="w-full h-auto rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-carbon-gray-900">
                How CrunchCarbon Works
              </h2>
              <p className="text-xl text-carbon-gray-600 max-w-3xl mx-auto">
                Our platform makes it easy to generate and monetize carbon credits from your renewable energy system.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="retro-card">
                <div className="rounded-full bg-carbon-green-100 p-4 inline-block mb-4">
                  <Leaf className="h-8 w-8 text-carbon-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-carbon-gray-900">Register Your System</h3>
                <p className="text-carbon-gray-600">
                  Complete a simple eligibility check and provide details about your renewable energy system.
                </p>
              </div>
              
              <div className="retro-card">
                <div className="rounded-full bg-carbon-blue-100 p-4 inline-block mb-4">
                  <BarChart3 className="h-8 w-8 text-carbon-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-carbon-gray-900">Generate Credits</h3>
                <p className="text-carbon-gray-600">
                  We calculate your carbon offset based on the energy your system produces and current carbon prices.
                </p>
              </div>
              
              <div className="retro-card">
                <div className="rounded-full bg-carbon-green-100 p-4 inline-block mb-4">
                  <Zap className="h-8 w-8 text-carbon-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-carbon-gray-900">Maximize Revenue</h3>
                <p className="text-carbon-gray-600">
                  Earn your share of carbon credit revenue with transparent pricing and no hidden fees.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 bg-carbon-gray-50">
          <div className="container mx-auto px-4">
            <div className="retro-card max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4 text-carbon-gray-900">
                Ready to Start Earning from Your Solar System?
              </h2>
              <p className="text-xl text-carbon-gray-600 mb-8">
                Join thousands of system owners already monetizing their carbon offsets.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate("/register")}
                  className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
                  size="lg"
                >
                  Sign Up as Client
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/register?role=agent")}
                  className="border-2 border-carbon-gray-200 text-carbon-gray-700 hover:bg-carbon-gray-50 retro-button"
                  size="lg"
                >
                  Become an Agent
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
