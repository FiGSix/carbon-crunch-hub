
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserRole, UserProfile } from '../types';

interface UseAuthDebugProps {
  user: User | null;
  userRole: UserRole | null;
  profile: UserProfile | null;
}

export function useAuthDebug({
  user,
  userRole,
  profile
}: UseAuthDebugProps) {
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const debugAuthState = async () => {
    try {
      // Generate debug information including authentication state
      const info = {
        timestamp: new Date().toISOString(),
        user: user ? {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at,
          lastSignIn: user.last_sign_in_at,
          authenticationType: user.app_metadata?.provider || 'unknown',
          userMetadata: user.user_metadata
        } : null,
        role: userRole,
        profile: profile ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          firstName: profile.first_name,
          lastName: profile.last_name,
          companyName: profile.company_name,
          termsAccepted: profile.terms_accepted_at
        } : null,
        localStorage: {
          keys: Object.keys(localStorage).filter(key => 
            key.includes('supabase') || key.includes('sb-')
          )
        },
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language
        }
      };
      
      console.log("Auth Debug Information:", info);
      
      const infoString = JSON.stringify(info, null, 2);
      setDebugInfo(infoString);
      
      return infoString;
    } catch (error) {
      console.error("Error generating debug info:", error);
      return "Error generating debug information";
    }
  };

  return { debugAuthState, debugInfo };
}
