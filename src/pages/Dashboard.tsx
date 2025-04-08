
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CO2OffsetChart } from "@/components/dashboard/CO2OffsetChart";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { FileText, TrendingUp, Wind } from "lucide-react";

const Dashboard = () => {
  // Mock data for stats
  const portfolioSize = 12.5; // MWp
  const totalProjects = 8;
  const potentialRevenue = 284350; // in Rands
  const co2Offset = 1245; // in tCO2
  
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Dashboard" 
        description="Welcome back! Here's an overview of your carbon credits."
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Portfolio Size" 
          value={`${portfolioSize} MWp`} 
          icon={<Wind className="h-5 w-5 text-carbon-green-600" />}
        />
        
        <StatsCard 
          title="Total Projects" 
          value={totalProjects} 
          icon={<FileText className="h-5 w-5 text-carbon-blue-600" />}
        />
        
        <StatsCard 
          title="Potential Revenue" 
          value={`R ${potentialRevenue.toLocaleString()}`} 
          icon={<TrendingUp className="h-5 w-5 text-carbon-green-600" />}
        />
        
        <StatsCard 
          title="CO₂ Offset" 
          value={`${co2Offset} tCO₂`} 
          icon={<Wind className="h-5 w-5 text-carbon-green-600" />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueChart />
        <CO2OffsetChart />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <RecentProjects />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
