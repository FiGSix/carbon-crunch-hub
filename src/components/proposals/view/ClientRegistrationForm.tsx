
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ClientRegistrationFormProps {
  proposalId: string;
  clientEmail: string;
  onComplete: () => void;
}

export function ClientRegistrationForm({ proposalId, clientEmail, onComplete }: ClientRegistrationFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a new user with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: clientEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'client',
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Once registered, update the client_id in the proposal
      if (data?.user) {
        // Try to update the proposal with the new client ID
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ client_id: data.user.id })
          .eq('id', proposalId)
          .is('client_id', null);
        
        if (updateError) {
          console.error("Error linking proposal to new client account:", updateError);
          // Don't throw here - the user has been created, we just couldn't link the proposal
          toast({
            title: "Account created",
            description: "Your account was created but there was an issue linking it to this proposal. Please contact support.",
            variant: "default"
          });
        } else {
          toast({
            title: "Registration successful!",
            description: "Your account has been created and linked to this proposal.",
            variant: "default"
          });
        }

        // Notify the parent component that registration is complete
        onComplete();
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle common errors
      if (error.message.includes("User already registered")) {
        setError("An account with this email already exists. Please sign in instead.");
        toast({
          title: "Account exists",
          description: "This email is already registered. Please use the login option instead.",
          variant: "destructive"
        });
      } else {
        setError(error.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Register to view and respond to this proposal. Your account will be linked to the email address: {clientEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={clientEmail}
              readOnly
              disabled
              className="bg-gray-100"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/login")} disabled={loading}>
          Already have an account? Sign In
        </Button>
      </CardFooter>
    </Card>
  );
}
