
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart } from "recharts";

export function RevenueChart() {
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer 
          config={{}} 
          className="aspect-[4/3]"
        >
          <BarChart data={[
            { name: 'Jan', value: 15000 },
            { name: 'Feb', value: 22000 },
            { name: 'Mar', value: 19000 },
            { name: 'Apr', value: 25000 },
            { name: 'May', value: 28000 },
            { name: 'Jun', value: 32000 },
          ]}>
            <ChartTooltip 
              content={<ChartTooltipContent />}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
