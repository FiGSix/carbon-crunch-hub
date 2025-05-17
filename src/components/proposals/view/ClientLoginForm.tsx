
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { ErrorDisplay } from "@/components/ui/error-display";
import { signIn } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useAuth } from "@/contexts/auth";

interface ClientLoginFormProps {
  clientEmail: string;
  onComplete: () => void;
}

export function ClientLoginForm({ clientEmail, onComplete }: ClientLoginFormProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  
  const { error, handleError, clearError } = useErrorHandler({
    context: "client-login",
    toastOnError: false
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      const { data, error: signInError } = await signIn(clientEmail, password);

      if (signInError) {
        throw signInError;
      }

      if (data?.session) {
        // Refresh user data after login
        await refreshUser();
        
        toast({
          title: "Login successful",
          description: "You are now logged in and can view the proposal.",
        });
        
        // Notify the parent component that login is complete
        onComplete();
      } else {
        throw new Error("Login successful but no session was created");
      }
    } catch (error: any) {
      handleError(
        error, 
        error.message?.includes("Invalid login credentials")
          ? "Invalid email or password. Please try again."
          : "Failed to log in. Please try again."
      );
      
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In to View Proposal</CardTitle>
        <CardDescription>
          Sign in with your client account to view this proposal. Your account should be linked to: {clientEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <ErrorDisplay 
            message={error.message || "Login failed"} 
            severity={error.severity}
            compact={true}
            className="mb-4"
          />
        )}
        
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={clientEmail}
              disabled
              readOnly
              className="bg-gray-100"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={() => window.location.href = "/forgot-password"} disabled={loading}>
          Forgot your password?
        </Button>
      </CardFooter>
    </Card>
  );
}
