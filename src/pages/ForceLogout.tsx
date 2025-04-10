
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ForceLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clearingStatus, setClearingStatus] = useState<"idle" | "clearing" | "completed">("idle");
  const [progressValue, setProgressValue] = useState(0);

  // Progress animation for better user feedback
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isProcessing) {
      setProgressValue(0);
      interval = setInterval(() => {
        setProgressValue(prev => {
          if (clearingStatus === "clearing" && prev < 90) return prev + 10;
          if (prev >= 90) return 90;
          return prev;
        });
      }, 100);
    } else if (clearingStatus === "completed") {
      setProgressValue(100);
    } else {
      setProgressValue(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, clearingStatus]);

  const clearBrowserStorage = () => {
    setClearingStatus("clearing");
    
    // Clear any Supabase-related items from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage as well
    sessionStorage.clear();
    
    setClearingStatus("completed");
    
    toast({
      title: "Storage cleared",
      description: "All browser storage related to authentication has been cleared."
    });
  };

  const handleForceLogout = async () => {
    try {
      setIsProcessing(true);
      setClearingStatus("clearing");
      
      // Sign out from all devices
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear browser storage
      clearBrowserStorage();
      
      toast({
        title: "Logged out successfully",
        description: "You have been forcefully logged out of all devices."
      });
      
      // Short delay to ensure all cleanup is complete and to show success state
      setTimeout(() => {
        // Redirect to login page
        navigate("/login");
      }, 1000);
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
        
        {clearingStatus !== "idle" && (
          <div className="mb-6">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-crunch-black/60">
                {clearingStatus === "clearing" ? "Clearing session data..." : "Session data cleared"}
              </span>
              <span className="text-crunch-black/60">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2 mb-4" />
          </div>
        )}
        
        <Alert className="mb-6 border-yellow-400 bg-yellow-50">
          <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            This utility will clear all authentication data and force a complete logout.
            Use this if you're experiencing login problems or role issues.
          </AlertDescription>
        </Alert>
        
        <p className="mb-6 text-crunch-black">
          Your browser storage has already been cleared automatically.
          Click below to complete the logout process for all devices.
        </p>
        
        <Button 
          onClick={handleForceLogout} 
          className="w-full"
          disabled={isProcessing}
          variant="secondary"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Completing Logout...
            </>
          ) : (
            "Complete Force Logout"
          )}
        </Button>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-crunch-black/70 mb-2">
            After logging out, try to log in again with correct credentials.
          </p>
          <a 
            href="/login" 
            className="text-crunch-yellow hover:underline"
          >
            Return to login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForceLogout;
