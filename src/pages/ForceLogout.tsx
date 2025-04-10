
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ForceLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const clearBrowserStorage = () => {
    // Clear any Supabase-related items from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage as well
    sessionStorage.clear();
    
    toast({
      title: "Storage cleared",
      description: "All browser storage related to authentication has been cleared."
    });
  };

  const handleForceLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      clearBrowserStorage();
      
      toast({
        title: "Logged out successfully",
        description: "You have been forcefully logged out of all devices."
      });
      
      // Redirect to login page
      navigate("/login");
    } catch (error) {
      console.error("Error during force logout:", error);
      toast({
        title: "Error",
        description: "There was a problem logging you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Automatically clear storage on page load
    clearBrowserStorage();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Force Logout</h1>
        <p className="mb-6 text-carbon-gray-600">
          This page helps resolve authentication issues by clearing all active sessions.
          Your browser storage has already been cleared automatically.
        </p>
        <Button 
          onClick={handleForceLogout} 
          className="w-full bg-carbon-green-500 hover:bg-carbon-green-600"
        >
          Complete Force Logout
        </Button>
        <div className="mt-4 text-center">
          <a 
            href="/login" 
            className="text-carbon-green-600 hover:underline"
          >
            Return to login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForceLogout;
