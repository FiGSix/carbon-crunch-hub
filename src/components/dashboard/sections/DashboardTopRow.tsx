import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";
import { VintageCountdown } from "./VintageCountdown";
import { VintageRevenueBreakdown } from "./VintageRevenueBreakdown";
import { DashboardMetricsByStage } from "@/hooks/dashboard/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface DashboardTopRowProps {
  loading?: boolean;
  metrics?: DashboardMetricsByStage;
  userRole?: string | null;
}

export function DashboardTopRow({ loading, metrics, userRole }: DashboardTopRowProps) {
  const isAdmin = userRole === 'admin';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
      {/* Row 1, Col 1: Vintage Status: Blend */}
      <PlaceholderCard 
        title="Vintage Status: Blend"
        description="Project blend status"
      />
      
      {/* Row 1, Col 2: Admin sees Audit Review Requests, others see Solar Starter Badge */}
      {isAdmin ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Audit Review Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.auditReviewRequests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Projects awaiting review</p>
          </CardContent>
        </Card>
      ) : (
        <PlaceholderCard 
          title="Solar Starter Badge"
          description="Referral tier progress"
        />
      )}
      
      {/* Row 1-2, Col 3: Vintage Revenue Breakdown - SPANS 2 ROWS, 3 COLS for admin */}
      <div className={`lg:row-span-2 flex ${isAdmin ? 'lg:col-span-3' : ''}`}>
        <VintageRevenueBreakdown className="flex-1" />
      </div>
      
      {/* Row 1-2, Col 4-5: Vintage Status: Blend Pipeline - spans 2 columns and 2 rows (hidden for admin) */}
      {!isAdmin && (
        <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 flex">
          <PlaceholderCard 
            title="Vintage Status: Blend Pipeline"
            description="Project stages overview"
            height="h-full"
            className="flex-1"
          />
        </div>
      )}
      
      {/* Row 2, Col 1-2: Vintage Countdown */}
      <div className="sm:col-span-2 lg:col-span-2">
        <VintageCountdown />
      </div>
    </div>
  );
}
