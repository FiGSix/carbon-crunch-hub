
import React from 'react';
import { LoginForm } from './client-login/LoginForm';

interface ClientLoginFormProps {
  clientEmail: string;
  onComplete: () => void;
}

export function ClientLoginForm({ clientEmail, onComplete }: ClientLoginFormProps) {
  return <LoginForm clientEmail={clientEmail} onComplete={onComplete} />;
}
