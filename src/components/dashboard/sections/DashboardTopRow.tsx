import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";

interface DashboardTopRowProps {
  loading?: boolean;
}

export function DashboardTopRow({ loading }: DashboardTopRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
      {/* Card 1: Vintage Status: Blend - 1 column */}
      <PlaceholderCard 
        title="Vintage Status: Blend"
        description="Project blend status"
      />
      
      {/* Card 2: Solar Starter Badge - 1 column */}
      <PlaceholderCard 
        title="Solar Starter Badge"
        description="Referral tier progress"
      />
      
      {/* Card 3: Vintage Revenue Breakdown - 1 column */}
      <PlaceholderCard 
        title="Vintage Revenue Breakdown"
        description="Revenue by year"
      />
      
      {/* Card 4: Vintage Status: Blend Pipeline - spans 2 columns */}
      <div className="sm:col-span-2 lg:col-span-2">
        <PlaceholderCard 
          title="Vintage Status: Blend Pipeline"
          description="Project stages overview"
          height="h-full min-h-[120px]"
        />
      </div>
    </div>
  );
}
