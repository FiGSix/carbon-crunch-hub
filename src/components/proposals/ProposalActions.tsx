
import { useState } from "react";
import { Plus, Upload, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { BulkProposalUpload } from "./BulkProposalUpload";
import { BulkMoveToOnboardingDialog } from "./BulkMoveToOnboardingDialog";

export function ProposalActions() {
  const navigate = useNavigate();
  const { userRole, profile } = useAuth();
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkMoveToOnboarding, setShowBulkMoveToOnboarding] = useState(false);
  
  // Only show for agents and admins
  if (userRole !== "agent" && userRole !== "admin") {
    return null;
  }
  
  // Hide for pending approval agents
  if (userRole === "agent" && profile?.agent_status === "pending_approval") {
    return null;
  }
  
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Button 
          onClick={() => navigate("/create-proposal")}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Proposal
        </Button>
        
        {(userRole === "agent" || userRole === "admin") && (
          <Button 
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
          >
            <Upload className="h-5 w-5 mr-2" />
            Bulk Upload
          </Button>
        )}
        
        {userRole === "admin" && (
          <Button 
            variant="outline"
            onClick={() => setShowBulkMoveToOnboarding(true)}
          >
            <Package className="h-5 w-5 mr-2" />
            Bulk Move to Onboarding
          </Button>
        )}
      </div>
      
      <BulkProposalUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => {
          // Refresh proposals list
          window.location.reload();
        }}
      />
      
      <BulkMoveToOnboardingDialog
        open={showBulkMoveToOnboarding}
        onOpenChange={setShowBulkMoveToOnboarding}
        onSuccess={() => {
          // Refresh proposals list
          window.location.reload();
        }}
      />
    </>
  );
}
