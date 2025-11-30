import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";

interface DashboardTopRowProps {
  loading?: boolean;
}

export function DashboardTopRow({ loading }: DashboardTopRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
      {/* Left column: 3 smaller cards */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlaceholderCard 
          title="Vintage Status: Blend"
          description="Project blend status"
        />
        <PlaceholderCard 
          title="Solar Starter Badge"
          description="Referral tier progress"
        />
        <PlaceholderCard 
          title="Vintage Revenue Breakdown"
          description="Revenue by year"
        />
      </div>
      
      {/* Right column: 1 larger card */}
      <div className="lg:col-span-1">
        <PlaceholderCard 
          title="Vintage Status: Blend Pipeline"
          description="Project stages overview"
          height="h-full min-h-[200px]"
        />
      </div>
    </div>
  );
}
