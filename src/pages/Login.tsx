
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { signIn, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { refreshUser, user, userRole, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && !authLoading) {
      console.log("User already logged in, redirecting to dashboard. User role:", userRole);
      const from = location.state?.from || "/dashboard";
      navigate(from);
    }
  }, [user, navigate, userRole, authLoading, location.state]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      const { data, error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      console.log("Sign in successful, refreshing user data");
      await refreshUser();
      
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      // Get the intended destination from location state, or default to dashboard
      const from = location.state?.from || "/dashboard";
      console.log(`Redirecting to: ${from}`);
      navigate(from);
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginAttempts(prev => prev + 1);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="mb-6">
            <Link to="/" className="flex items-center text-crunch-black/70 hover:text-crunch-yellow">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg border border-crunch-black/10">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-crunch-black">Welcome back</h1>
              <p className="text-crunch-black/70 mt-2">Log in to your CrunchCarbon account</p>
            </div>
            
            {loginAttempts >= 2 && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Having trouble logging in? Try our <Link to="/force-logout" className="font-medium underline">
                    force logout
                  </Link> tool to fix session issues.
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 border-2 border-crunch-black/10 focus:border-crunch-yellow"
                    placeholder="you@example.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-sm text-crunch-yellow hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 pr-10 border-2 border-crunch-black/10 focus:border-crunch-yellow"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-crunch-black/50 hover:text-crunch-black focus:outline-none mt-1"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log in"
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-crunch-black/70">
                Don't have an account?{" "}
                <Link to="/register" className="text-crunch-yellow hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
