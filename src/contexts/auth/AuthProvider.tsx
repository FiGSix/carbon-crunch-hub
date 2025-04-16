
import { ReactNode } from 'react';
import { AuthState } from './components/AuthState';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthState>{children}</AuthState>;
}
