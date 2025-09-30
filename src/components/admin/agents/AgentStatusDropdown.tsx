
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface AgentStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export function AgentStatusDropdown({ 
  currentStatus, 
  onStatusChange, 
  disabled 
}: AgentStatusDropdownProps) {
  const statusOptions = [
    { 
      value: 'active', 
      label: 'Set as Active', 
      icon: CheckCircle,
      description: 'Agent can access all features'
    },
    { 
      value: 'inactive', 
      label: 'Set as Inactive', 
      icon: XCircle,
      description: 'Agent cannot access system'
    },
    { 
      value: 'suspended', 
      label: 'Suspend Agent', 
      icon: AlertTriangle,
      description: 'Temporarily block access'
    },
    { 
      value: 'pending_approval', 
      label: 'Mark Pending', 
      icon: Clock,
      description: 'Requires admin approval'
    }
  ];

  return (
    <>
      {statusOptions
        .filter(option => option.value !== currentStatus)
        .map((option) => {
          const IconComponent = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              disabled={disabled}
              className="flex flex-col items-start space-y-1"
            >
              <div className="flex items-center">
                <IconComponent className="h-4 w-4 mr-2" />
                {option.label}
              </div>
              <div className="text-xs text-muted-foreground ml-6">
                {option.description}
              </div>
            </DropdownMenuItem>
          );
        })}
    </>
  );
}