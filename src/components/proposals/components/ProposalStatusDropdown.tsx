
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { updateProposalStatus } from "@/services/proposals/statusUpdateService";
import { logger } from "@/lib/logger";

interface ProposalStatusDropdownProps {
  proposalId: string;
  currentStatus: string;
  onStatusUpdate?: () => void;
}

// Map user-friendly labels to database values
const STATUS_OPTIONS = [
  { value: "pending", label: "Sent" },
  { value: "rejected", label: "Declined" },
  { value: "approved", label: "Accepted" },
] as const;

export function ProposalStatusDropdown({ 
  proposalId, 
  currentStatus, 
  onStatusUpdate 
}: ProposalStatusDropdownProps) {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const statusLogger = logger.withContext({
    component: 'ProposalStatusDropdown',
    proposalId
  });

  // Only agents and admins can update status
  const canUpdateStatus = userRole === 'agent' || userRole === 'admin';

  // Find the current status option
  const currentOption = STATUS_OPTIONS.find(option => option.value === currentStatus);
  const currentLabel = currentOption?.label || currentStatus;

  const handleStatusChange = async (newStatus: string) => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    statusLogger.info("Updating proposal status", { 
      oldStatus: currentStatus, 
      newStatus,
      userId: user.id 
    });

    try {
      const result = await updateProposalStatus(proposalId, newStatus, user.id);
      
      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Proposal status changed to ${STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label}`,
        });

        // Trigger proposal list refresh
        if (onStatusUpdate) {
          onStatusUpdate();
        }

        // Emit global event for other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', {
          detail: { id: proposalId, status: newStatus }
        }));

        statusLogger.info("Status update successful", { newStatus });
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
      statusLogger.error("Status update failed", { error: errorMessage });
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // If user can't update status, show read-only badge
  if (!canUpdateStatus) {
    return <ProposalStatusBadge status={currentStatus} />;
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-auto min-w-[120px] h-8 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <ProposalStatusBadge status={currentStatus} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[120px]">
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <ProposalStatusBadge status={option.value} />
              <span className="text-sm">{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
