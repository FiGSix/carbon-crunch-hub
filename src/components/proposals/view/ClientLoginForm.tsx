
import React from 'react';
import { LoginForm } from './client-login/LoginForm';

interface ClientLoginFormProps {
  clientEmail: string;
  onComplete: () => void;
  onError?: (errorMessage: string) => void;
}

export function ClientLoginForm({ clientEmail, onComplete, onError }: ClientLoginFormProps) {
  return <LoginForm 
    clientEmail={clientEmail} 
    onComplete={onComplete} 
    onError={onError}
  />;
}
