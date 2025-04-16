
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientRegistrationForm } from './ClientRegistrationForm';
import { ClientLoginForm } from './ClientLoginForm';
import { useAuth } from "@/contexts/AuthContext";

interface ClientAuthWrapperProps {
  proposalId: string;
  clientEmail: string;
  onAuthComplete: () => void;
}

export function ClientAuthWrapper({ proposalId, clientEmail, onAuthComplete }: ClientAuthWrapperProps) {
  const [activeTab, setActiveTab] = useState<string>("register");
  const { user } = useAuth();
  
  // If user is already authenticated, complete the process
  useEffect(() => {
    if (user) {
      onAuthComplete();
    }
  }, [user, onAuthComplete]);

  return (
    <div className="max-w-md mx-auto my-8">
      <Tabs defaultValue="register" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Create Account</TabsTrigger>
          <TabsTrigger value="login">Sign In</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register">
          <ClientRegistrationForm 
            proposalId={proposalId} 
            clientEmail={clientEmail} 
            onComplete={onAuthComplete} 
          />
        </TabsContent>
        
        <TabsContent value="login">
          <ClientLoginForm 
            clientEmail={clientEmail} 
            onComplete={onAuthComplete} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
