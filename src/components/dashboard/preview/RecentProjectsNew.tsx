
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, RefreshCw, ChevronRight, Folders } from "lucide-react";
import { Proposal } from "@/components/proposals/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface RecentProjectsNewProps {
  proposals?: Proposal[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function RecentProjectsNew({ proposals = [], loading = false, onRefresh }: RecentProjectsNewProps) {
  const navigate = useNavigate();
  
  // Show skeleton loading state
  if (loading) {
    return (
      <Card className="border border-crunch-black/5 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Folders className="h-5 w-5 text-crunch-yellow" />
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Recent Projects
            </span>
          </CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Function to view a proposal
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  // Filter to display only recent proposals (at most 4)
  const recentProjects = proposals.length > 0 
    ? proposals.slice(0, 4) 
    : [
        { id: "1", name: "Sunnydale Solar Farm", size: 4.2, client: "Cape Town Energy", date: "2024-01-15", status: "pending", revenue: 120000 },
        { id: "2", name: "Greenfield Energy", size: 2.8, client: "Johannesburg Power", date: "2024-02-03", status: "pending", revenue: 85000 },
        { id: "3", name: "Eastside Power Plant", size: 3.5, client: "Durban Utilities", date: "2024-03-10", status: "approved", revenue: 110000 },
        { id: "4", name: "Clearwater Solar", size: 2.0, client: "Pretoria Solar", date: "2024-03-22", status: "draft", revenue: 67000 },
      ];

  const statusColors = {
    draft: "bg-blue-50 text-blue-700 border-blue-100",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
    approved: "bg-green-50 text-green-700 border-green-100",
    rejected: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="border border-crunch-black/5 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Folders className="h-5 w-5 text-crunch-yellow" />
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Recent Projects
            </span>
          </CardTitle>
          <div className="flex space-x-2">
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="border-crunch-black/10 hover:bg-crunch-black/5"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="bg-crunch-yellow/10 text-crunch-black hover:bg-crunch-yellow/20 border-crunch-yellow/20"
              onClick={() => navigate('/proposals/create')}
            >
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <div className="bg-gradient-to-r from-crunch-black/5 to-crunch-black/3 px-6 py-2">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-crunch-black/60 uppercase tracking-wider">
                <div className="col-span-5 sm:col-span-4">Project Name</div>
                <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Size</div>
                <div className="hidden sm:block sm:col-span-3">Client</div>
                <div className="col-span-3 sm:col-span-2 text-center">Status</div>
                <div className="col-span-1 text-right"></div>
              </div>
            </div>
            <div className="divide-y divide-crunch-black/5">
              {recentProjects.map((project, index) => (
                <motion.div 
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 + 0.3 }}
                  className="px-6 py-4 transition-colors hover:bg-crunch-black/[0.02] group"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5 sm:col-span-4 font-medium truncate">{project.name}</div>
                    <div className="col-span-3 sm:col-span-2 text-right sm:text-left text-crunch-black/70">{project.size.toFixed(1)} MWp</div>
                    <div className="hidden sm:block sm:col-span-3 text-crunch-black/70 truncate">{project.client}</div>
                    <div className="col-span-3 sm:col-span-2 text-center">
                      <Badge 
                        variant="outline" 
                        className={`${statusColors[project.status as keyof typeof statusColors] || "bg-gray-50 text-gray-700"} text-xs py-0.5 px-2 border`}
                      >
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 hover:bg-transparent text-crunch-black/40 hover:text-crunch-black group-hover:text-crunch-yellow"
                        onClick={() => handleViewProposal(project.id)}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="py-4 text-right px-6">
            <Button 
              variant="link" 
              onClick={() => navigate('/proposals')}
              className="text-crunch-black hover:text-crunch-yellow font-medium"
            >
              View All Projects <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
