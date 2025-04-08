
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ProposalList, Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";

const Proposals = () => {
  // Mock proposals data
  const proposals: Proposal[] = [
    { 
      id: 1, 
      name: "Sunnydale Solar Farm", 
      client: "John Smith", 
      date: "2024-03-15", 
      size: 4.2, 
      status: "approved", 
      revenue: 123450 
    },
    { 
      id: 2, 
      name: "Greenfield Energy", 
      client: "Sarah Johnson", 
      date: "2024-03-03", 
      size: 2.8, 
      status: "pending", 
      revenue: 86000 
    },
    { 
      id: 3, 
      name: "Eastside Power Plant", 
      client: "Michael Brown", 
      date: "2024-02-22", 
      size: 3.5, 
      status: "approved", 
      revenue: 107500 
    },
    { 
      id: 4, 
      name: "Clearwater Solar", 
      client: "Emily Davis", 
      date: "2024-02-15", 
      size: 2.0, 
      status: "rejected", 
      revenue: 61000 
    },
    { 
      id: 5, 
      name: "Northern Lights Energy", 
      client: "Robert Wilson", 
      date: "2024-02-10", 
      size: 5.5, 
      status: "approved", 
      revenue: 165000 
    },
    { 
      id: 6, 
      name: "Hillside Renewables", 
      client: "James Taylor", 
      date: "2024-01-28", 
      size: 3.2, 
      status: "approved", 
      revenue: 92800 
    },
  ];
  
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Proposals" 
        description="Manage and track all your carbon credit proposals." 
      />
      
      <Card className="retro-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Proposal Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalActions />
          <ProposalFilters />
          <ProposalList proposals={proposals} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Proposals;
