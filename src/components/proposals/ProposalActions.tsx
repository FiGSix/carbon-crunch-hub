
import { Download, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ProposalActions() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <Button 
        className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
        onClick={() => navigate("/proposals/new")}
      >
        <Plus className="h-5 w-5 mr-2" />
        Create New Proposal
      </Button>
      <Button variant="outline" className="retro-button">
        <Download className="h-5 w-5 mr-2" />
        Export Proposals
      </Button>
    </div>
  );
}
