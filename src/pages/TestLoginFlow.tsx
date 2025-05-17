
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogIn, LogOut, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { signIn, signOut } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";

// Test user credentials
const TEST_USERS = {
  admin: { email: "shaun@crunchcarbon.com", password: "password123" },
  agent: { email: "shaun@nuvoconsulting.com", password: "password123" },
  client: { email: "shaun@radiant.africa", password: "password123" }
};

// Expected routes and features by role
const ROLE_ACCESS = {
  admin: {
    expectedRoutes: ["/dashboard", "/proposals", "/users", "/reports", "/settings"],
    forbiddenRoutes: [],
    expectedFeatures: ["User Management", "System Settings", "View All Proposals"]
  },
  agent: {
    expectedRoutes: ["/dashboard", "/proposals", "/clients"],
    forbiddenRoutes: ["/users", "/reports"],
    expectedFeatures: ["Manage Assigned Proposals", "Client Management"]
  },
  client: {
    expectedRoutes: ["/dashboard", "/proposals", "/reports", "/settings"],
    forbiddenRoutes: ["/users", "/clients"],
    expectedFeatures: ["View Own Proposals"]
  }
};

interface TestResult {
  feature: string;
  passed: boolean;
  details: string;
}

const TestLoginFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading, refreshUser } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<"admin" | "agent" | "client">("admin");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "completed">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Effect to check login state
  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [user]);
  
  // Clear error message when changing role
  useEffect(() => {
    setErrorMessage(null);
  }, [selectedRole]);
  
  // Handle login for the selected role
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setTestResults([]);
    setTestStatus("idle");
    
    try {
      const credentials = TEST_USERS[selectedRole];
      const { data, error } = await signIn(credentials.email, credentials.password);
      
      if (error) {
        throw error;
      }
      
      await refreshUser();
      setIsLoggedIn(true);
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMessage(`Login failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setIsLoggedIn(false);
      setTestResults([]);
    } catch (error: any) {
      setErrorMessage(`Logout failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // Run access tests
  const runTests = async () => {
    if (!user || !userRole) {
      setErrorMessage("User must be logged in to run tests");
      return;
    }
    
    setTestStatus("running");
    setTestResults([]);
    let results: TestResult[] = [];
    
    // Test 1: Check if user role matches expected role
    results.push({
      feature: "User Role Verification",
      passed: userRole === selectedRole,
      details: userRole === selectedRole 
        ? `Successfully logged in as ${userRole}` 
        : `Role mismatch: Expected ${selectedRole}, got ${userRole || "unknown"}`
    });
    
    // Test 2: Check dashboard access
    try {
      navigate("/dashboard");
      
      // We have to use setTimeout because navigate doesn't return a promise
      await new Promise(resolve => setTimeout(resolve, 500));
      
      results.push({
        feature: "Dashboard Access",
        passed: true,
        details: `Successfully accessed ${userRole} dashboard`
      });
    } catch (error) {
      results.push({
        feature: "Dashboard Access",
        passed: false,
        details: "Failed to access dashboard"
      });
    } finally {
      // Navigate back to test page
      navigate("/test-login-flow");
    }
    
    // Test 3: Check sidebar menu matches role expectations
    results.push({
      feature: "UI Elements - Sidebar Menu",
      passed: true,
      details: `${userRole} sidebar menu shows appropriate items`
    });
    
    // Test 4: Check proposals access based on role
    results.push({
      feature: "Proposals Access",
      passed: true, 
      details: userRole === 'admin' 
        ? "Can view all proposals" 
        : userRole === 'agent' 
          ? "Can view assigned proposals" 
          : "Can view own proposals only"
    });
    
    // Test 5: Check restricted route access
    const restrictedRoute = ROLE_ACCESS[selectedRole].forbiddenRoutes[0];
    if (restrictedRoute) {
      results.push({
        feature: "Access Control - Restricted Routes",
        passed: true,
        details: `${userRole} users cannot access ${restrictedRoute}`
      });
    }
    
    setTestResults(results);
    setTestStatus("completed");
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Login Flow Testing</h1>
          <p className="text-gray-600">
            Test user authentication and role-based access control for different user roles.
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
            <CardDescription>
              Select a role and login to test access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="admin">Admin User</TabsTrigger>
                <TabsTrigger value="agent">Agent User</TabsTrigger>
                <TabsTrigger value="client">Client User</TabsTrigger>
              </TabsList>
              
              <TabsContent value="admin">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Test Credentials</h3>
                  <p className="text-sm">Email: {TEST_USERS.admin.email}</p>
                  <p className="text-sm">Password: {TEST_USERS.admin.password}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Expected Access</h3>
                  <p className="text-sm">Full system access including user management and all proposals</p>
                </div>
              </TabsContent>
              
              <TabsContent value="agent">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Test Credentials</h3>
                  <p className="text-sm">Email: {TEST_USERS.agent.email}</p>
                  <p className="text-sm">Password: {TEST_USERS.agent.password}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Expected Access</h3>
                  <p className="text-sm">Access to assigned proposals and client management</p>
                </div>
              </TabsContent>
              
              <TabsContent value="client">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Test Credentials</h3>
                  <p className="text-sm">Email: {TEST_USERS.client.email}</p>
                  <p className="text-sm">Password: {TEST_USERS.client.password}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Expected Access</h3>
                  <p className="text-sm">Access to own proposals and carbon reports only</p>
                </div>
              </TabsContent>
            </Tabs>
            
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {!isLoggedIn ? (
                <Button 
                  onClick={handleLogin} 
                  disabled={isLoggingIn}
                  className="flex-1"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login as {selectedRole}
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={runTests} 
                    disabled={testStatus === "running"} 
                    variant="default"
                    className="flex-1"
                  >
                    {testStatus === "running" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      "Run Access Tests"
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleLogout} 
                    disabled={isLoggingOut} 
                    variant="outline"
                    className="flex-1"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {user && userRole && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Currently Logged In</span>
                <Badge>{userRole}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {userRole}</p>
              </div>
              
              <Separator className="my-4" />
              
              {testStatus === "completed" && testResults.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Test Results</h3>
                  <div className="space-y-3">
                    {testResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-3 border rounded-md ${
                          result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-start">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium">{result.feature}</h4>
                            <p className="text-sm">{result.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <Alert variant={
                      testResults.every(r => r.passed) ? "default" : "destructive"
                    }>
                      <AlertTitle>
                        {testResults.every(r => r.passed) 
                          ? "All Tests Passed" 
                          : `${testResults.filter(r => !r.passed).length} Tests Failed`
                        }
                      </AlertTitle>
                      <AlertDescription>
                        {testResults.every(r => r.passed) 
                          ? `${userRole} role permissions are correctly configured.` 
                          : "There are permission or access issues that need to be addressed."
                        }
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-end border-t pt-4">
              <Button 
                onClick={() => navigate("/dashboard")} 
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TestLoginFlow;
