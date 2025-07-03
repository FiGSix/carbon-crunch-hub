
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

export function ProposalActions() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  // Only show for agents and admins
  if (userRole !== "agent" && userRole !== "admin") {
    return null;
  }
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <Button 
        onClick={() => navigate("/create-proposal")}
      >
        <Plus className="h-5 w-5 mr-2" />
        Create New Proposal
      </Button>
    </div>
  );
}
