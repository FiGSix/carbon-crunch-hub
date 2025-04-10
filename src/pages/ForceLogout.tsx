
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ForceLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");

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
      setIsProcessing(true);
      await supabase.auth.signOut({ scope: 'global' });
      clearBrowserStorage();
      
      toast({
        title: "Logged out successfully",
        description: "You have been forcefully logged out of all devices."
      });
      
      // Short delay to ensure all cleanup is complete
      setTimeout(() => {
        // Redirect to login page
        navigate("/login");
      }, 500);
    } catch (error) {
      console.error("Error during force logout:", error);
      toast({
        title: "Error",
        description: "There was a problem logging you out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
        <Alert className="mb-6 border-yellow-400 bg-yellow-50">
          <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            This utility will clear all authentication data and force a complete logout.
            Use this if you're experiencing login problems or role issues.
          </AlertDescription>
        </Alert>
        
        <p className="mb-6 text-carbon-gray-600">
          Your browser storage has already been cleared automatically.
          Click below to complete the logout process for all devices.
        </p>
        
        <Button 
          onClick={handleForceLogout} 
          className="w-full bg-carbon-green-500 hover:bg-carbon-green-600"
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Complete Force Logout"}
        </Button>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-carbon-gray-500 mb-2">
            After logging out, try to log in again with correct credentials.
          </p>
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
