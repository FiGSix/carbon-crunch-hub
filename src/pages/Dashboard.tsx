
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "@/components/ui/chart";
import { 
  ArrowRight, 
  FileText, 
  Plus, 
  TrendingUp, 
  Wind 
} from "lucide-react";

const Dashboard = () => {
  // Mock data for charts and stats
  const portfolioSize = 12.5; // MWp
  const totalProjects = 8;
  const potentialRevenue = 284350; // in Rands
  const co2Offset = 1245; // in tCO2
  
  // Sample projects data
  const recentProjects = [
    { id: 1, name: "Sunnydale Solar Farm", size: 4.2, location: "Cape Town", date: "2024-01-15" },
    { id: 2, name: "Greenfield Energy", size: 2.8, location: "Johannesburg", date: "2024-02-03" },
    { id: 3, name: "Eastside Power Plant", size: 3.5, location: "Durban", date: "2024-03-10" },
    { id: 4, name: "Clearwater Solar", size: 2.0, location: "Pretoria", date: "2024-03-22" },
  ];
  
  // Sample data for charts
  const monthlyRevenueData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Monthly Revenue (R)",
        data: [15000, 22000, 19000, 25000, 28000, 32000],
        backgroundColor: "rgba(58, 156, 62, 0.6)",
        borderColor: "rgb(58, 156, 62)",
        borderWidth: 2,
      },
    ],
  };
  
  const co2OffsetData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "CO2 Offset (tCO2)",
        data: [75, 105, 95, 120, 135, 150],
        borderColor: "rgb(76, 136, 227)",
        backgroundColor: "rgba(76, 136, 227, 0.1)",
        tension: 0.3,
      },
    ],
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-carbon-gray-900">Dashboard</h1>
        <p className="text-carbon-gray-600">Welcome back! Here's an overview of your carbon credits.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="retro-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-carbon-gray-500">Portfolio Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{portfolioSize} MWp</div>
              <div className="rounded-full bg-carbon-green-100 p-2">
                <Wind className="h-5 w-5 text-carbon-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="retro-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-carbon-gray-500">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{totalProjects}</div>
              <div className="rounded-full bg-carbon-blue-100 p-2">
                <FileText className="h-5 w-5 text-carbon-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="retro-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-carbon-gray-500">Potential Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">R {potentialRevenue.toLocaleString()}</div>
              <div className="rounded-full bg-carbon-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-carbon-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="retro-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-carbon-gray-500">CO₂ Offset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{co2Offset} tCO₂</div>
              <div className="rounded-full bg-carbon-green-100 p-2">
                <Wind className="h-5 w-5 text-carbon-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={monthlyRevenueData}
              className="aspect-[4/3]"
            />
          </CardContent>
        </Card>
        
        <Card className="retro-card">
          <CardHeader>
            <CardTitle>CO₂ Offset Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={co2OffsetData}
              className="aspect-[4/3]"
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
