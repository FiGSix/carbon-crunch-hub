import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVintageRevenueBreakdown } from "@/hooks/dashboard/useVintageRevenueBreakdown";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VintageRevenueBreakdownProps {
  className?: string;
}

export function VintageRevenueBreakdown({ className }: VintageRevenueBreakdownProps) {
  const { data, isLoading } = useVintageRevenueBreakdown();

  // Format currency as South African Rand
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Vintage Est. Revenue:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Vintage Est. Revenue:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No revenue data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Vintage Est. Revenue:</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Blend (2024) - Green */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full min-w-[60px]" style={{ backgroundColor: '#8ED973' }}>
            <span className="text-sm font-medium text-white">Blend</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {data.blend !== null ? formatCurrency(data.blend) : (
              <span className="text-muted-foreground">Missed Vintage</span>
            )}
          </div>
        </div>

        {/* 2025 - Red */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full min-w-[60px]" style={{ backgroundColor: '#FF4C44' }}>
            <span className="text-sm font-medium text-white">2025</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2025'] || 0)}
          </div>
        </div>

        {/* 2026 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2026</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2026'] || 0)}
          </div>
        </div>

        {/* 2027 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2027</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2027'] || 0)}
          </div>
        </div>

        {/* 2028 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2028</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2028'] || 0)}
          </div>
        </div>

        {/* 2029 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2029</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2029'] || 0)}
          </div>
        </div>

        {/* 2030 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2030</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(data.years['2030'] || 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
