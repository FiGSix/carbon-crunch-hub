
import { createContext, ReactNode } from 'react';
import { AuthContextType } from '../types';

// Create the auth context with an undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthContextProviderProps {
  children: ReactNode;
  value: AuthContextType;
}

export function AuthContextProvider({ children, value }: AuthContextProviderProps) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
