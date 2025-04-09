
import { Download, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ProposalActions() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <Button 
        className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium"
        onClick={() => navigate("/proposals/new")}
      >
        <Plus className="h-5 w-5 mr-2" />
        Create New Proposal
      </Button>
      <Button 
        variant="outline" 
        className="border-2 border-crunch-black/10 hover:bg-crunch-yellow/10"
      >
        <Download className="h-5 w-5 mr-2" />
        Export Proposals
      </Button>
    </div>
  );
}
