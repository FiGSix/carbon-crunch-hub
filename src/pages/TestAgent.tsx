import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signIn } from "@/lib/supabase/auth";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";

const TestAgent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "password123", // Default password for testing
    firstName: "Test",
    lastName: "Agent",
    companyName: "Test Agency",
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [result, setResult] = useState<{success?: boolean; message?: string; userId?: string}>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const createTestAgent = async () => {
    try {
      setIsCreating(true);
      setResult({});
      
      // Call the edge function to create a test agent
      const { data, error } = await supabase.functions.invoke("create-test-agent", {
        body: formData,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setResult({
        success: true,
        message: "Test agent created successfully!",
        userId: data.user?.id,
      });
      
      toast({
        title: "Success",
        description: "Test agent account created",
      });
    } catch (error) {
      console.error("Error creating test agent:", error);
      
      setResult({
        success: false,
        message: error.message || "Failed to create test agent",
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to create test agent",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const loginAsTestAgent = async () => {
    try {
      setIsLoggingIn(true);
      
      const { data, error } = await signIn(formData.email, formData.password);
      
      if (error) {
        throw error;
      }
      
      await refreshUser();
      
      toast({
        title: "Success",
        description: "Logged in as test agent",
      });
      
      // Redirect to proposals page
      navigate("/proposals");
    } catch (error) {
      console.error("Error logging in:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container py-10">
        <Card className="max-w-md mx-auto retro-card">
          <CardHeader>
            <CardTitle>Create Test Agent Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="test@example.com"
                  className="retro-input mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  value={formData.password}
                  onChange={handleChange}
                  className="retro-input mt-1"
                  required
                />
                <p className="text-xs text-carbon-gray-500 mt-1">
                  Default password for easy testing.
                </p>
              </div>
              
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="retro-input mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="retro-input mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="retro-input mt-1"
                />
              </div>
              
              {result.message && (
                <div className={`p-3 rounded-md ${result.success ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  <p className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    {result.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button 
                  onClick={createTestAgent}
                  disabled={isCreating || !formData.email}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Test Agent"
                  )}
                </Button>
                
                {result.success && (
                  <Button 
                    onClick={loginAsTestAgent}
                    disabled={isLoggingIn}
                    variant="secondary"
                    className="w-full"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login as This Agent"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TestAgent;
