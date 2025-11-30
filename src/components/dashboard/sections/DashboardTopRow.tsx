import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";
import { VintageCountdown } from "./VintageCountdown";

interface DashboardTopRowProps {
  loading?: boolean;
}

export function DashboardTopRow({ loading }: DashboardTopRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
      {/* Row 1, Col 1: Vintage Status: Blend */}
      <PlaceholderCard 
        title="Vintage Status: Blend"
        description="Project blend status"
      />
      
      {/* Row 1, Col 2: Solar Starter Badge */}
      <PlaceholderCard 
        title="Solar Starter Badge"
        description="Referral tier progress"
      />
      
      {/* Row 1-2, Col 3: Vintage Revenue Breakdown - SPANS 2 ROWS */}
      <div className="lg:row-span-2 flex">
        <PlaceholderCard 
          title="Vintage Revenue Breakdown"
          description="Revenue by year"
          height="h-full"
          className="flex-1"
        />
      </div>
      
      {/* Row 1-2, Col 4-5: Vintage Status: Blend Pipeline - spans 2 columns and 2 rows */}
      <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 flex">
        <PlaceholderCard 
          title="Vintage Status: Blend Pipeline"
          description="Project stages overview"
          height="h-full"
          className="flex-1"
        />
      </div>
      
      {/* Row 2, Col 1-2: Vintage Countdown */}
      <div className="sm:col-span-2 lg:col-span-2">
        <VintageCountdown />
      </div>
    </div>
  );
}
