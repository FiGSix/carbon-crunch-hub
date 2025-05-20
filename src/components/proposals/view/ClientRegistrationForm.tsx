
import React from 'react';
import { RegistrationForm } from './client-registration/RegistrationForm';

interface ClientRegistrationFormProps {
  proposalId: string;
  clientEmail: string;
  onComplete: () => void;
}

export function ClientRegistrationForm({ proposalId, clientEmail, onComplete }: ClientRegistrationFormProps) {
  return <RegistrationForm proposalId={proposalId} clientEmail={clientEmail} onComplete={onComplete} />;
}
