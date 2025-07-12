
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
import { EnhancedStatusUpdateService } from "@/services/proposals/enhancedStatusUpdateService";
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
    statusLogger.info("Updating proposal status with enhanced cache invalidation", { 
      oldStatus: currentStatus, 
      newStatus,
      userId: user.id 
    });

    try {
      // Apply optimistic update first for immediate UI feedback
      await EnhancedStatusUpdateService.updateStatusWithCacheInvalidation(
        proposalId,
        newStatus,
        user.id,
        userRole || 'client',
        currentStatus
      );

      // Then perform the actual database update
      const result = await updateProposalStatus(proposalId, newStatus, user.id);
      
      if (result.success) {
        statusLogger.info("Status updated successfully with cache invalidation");
        
        toast({
          title: "Status Updated",
          description: `Proposal status changed to ${STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label}`,
        });

        // Trigger callback for component updates
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error(result.error || "Failed to update status");
      }
    } catch (error) {
      statusLogger.error("Status update failed", { error });
      
      // Revert optimistic update by triggering cache invalidation with current status
      await EnhancedStatusUpdateService.updateStatusWithCacheInvalidation(
        proposalId,
        currentStatus, // Revert to current status
        user.id,
        userRole || 'client'
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
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
