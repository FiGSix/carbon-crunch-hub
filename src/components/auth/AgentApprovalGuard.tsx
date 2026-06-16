import { useAuth } from '@/contexts/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock } from 'lucide-react';

export function AgentApprovalGuard({ children }: { children: React.ReactNode }) {
  const { profile, userRole } = useAuth();
  
  // Only check for agents
  if (userRole !== 'agent') {
    return <>{children}</>;
  }
  
  // Block access if agent is not approved
  if (profile?.agent_status === 'pending_approval') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Account Pending Approval</AlertTitle>
            <AlertDescription>
              Your agent account is currently under review. You will receive a notification 
              once an administrator has approved your account. This typically takes 24-48 hours.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
