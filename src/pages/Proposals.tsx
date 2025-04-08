
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ArrowRight, 
  Download, 
  FileText, 
  Plus, 
  Search 
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Proposals = () => {
  const navigate = useNavigate();
  
  // Mock proposals data
  const proposals = [
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
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-carbon-green-100 text-carbon-green-700 hover:bg-carbon-green-200">Approved</Badge>;
      case "pending":
        return <Badge className="bg-carbon-blue-100 text-carbon-blue-700 hover:bg-carbon-blue-200">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-carbon-gray-900">Proposals</h1>
        <p className="text-carbon-gray-600">Manage and track all your carbon credit proposals.</p>
      </div>
      
      <Card className="retro-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Proposal Management
          </CardTitle>
        </CardHeader>
        <CardContent>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400" />
              <Input 
                placeholder="Search proposals..." 
                className="pl-10 retro-input"
              />
            </div>
            
            <Select defaultValue="all">
              <SelectTrigger className="retro-input">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select defaultValue="newest">
              <SelectTrigger className="retro-input">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="size-high">Size (High to Low)</SelectItem>
                <SelectItem value="size-low">Size (Low to High)</SelectItem>
                <SelectItem value="revenue-high">Revenue (High to Low)</SelectItem>
                <SelectItem value="revenue-low">Revenue (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size (MWp)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Est. Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{proposal.name}</TableCell>
                    <TableCell>{proposal.client}</TableCell>
                    <TableCell>{new Date(proposal.date).toLocaleDateString()}</TableCell>
                    <TableCell>{proposal.size} MWp</TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell className="text-right">R {proposal.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-carbon-blue-600">
                        View <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Proposals;
