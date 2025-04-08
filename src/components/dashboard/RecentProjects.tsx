
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";

interface Project {
  id: number;
  name: string;
  size: number;
  location: string;
  date: string;
}

export function RecentProjects() {
  // Sample projects data
  const recentProjects = [
    { id: 1, name: "Sunnydale Solar Farm", size: 4.2, location: "Cape Town", date: "2024-01-15" },
    { id: 2, name: "Greenfield Energy", size: 2.8, location: "Johannesburg", date: "2024-02-03" },
    { id: 3, name: "Eastside Power Plant", size: 3.5, location: "Durban", date: "2024-03-10" },
    { id: 4, name: "Clearwater Solar", size: 2.0, location: "Pretoria", date: "2024-03-22" },
  ];

  return (
    <Card className="retro-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Projects</CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          className="retro-button"
        >
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-carbon-gray-200">
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Project Name</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Size (MWp)</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Location</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Date Added</th>
                <th className="text-right py-3 px-4 font-medium text-carbon-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((project) => (
                <tr key={project.id} className="border-b border-carbon-gray-100 hover:bg-carbon-gray-50">
                  <td className="py-3 px-4">{project.name}</td>
                  <td className="py-3 px-4">{project.size} MWp</td>
                  <td className="py-3 px-4">{project.location}</td>
                  <td className="py-3 px-4">{new Date(project.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" className="text-carbon-blue-600">
                      View <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
