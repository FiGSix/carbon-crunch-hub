
import React from 'react';
import { RegistrationForm } from './client-registration/RegistrationForm';

interface ClientRegistrationFormProps {
  proposalId: string;
  clientEmail: string;
  onComplete: () => void;
  onError?: (errorMessage: string) => void;
}

export function ClientRegistrationForm({ proposalId, clientEmail, onComplete, onError }: ClientRegistrationFormProps) {
  return <RegistrationForm 
    proposalId={proposalId} 
    clientEmail={clientEmail} 
    onComplete={onComplete}
    onError={onError} 
  />;
}
