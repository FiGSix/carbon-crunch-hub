
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
import { LineChart } from "recharts";

export function CO2OffsetChart() {
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>CO₂ Offset Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer 
          config={{}} 
          className="aspect-[4/3]"
        >
          <LineChart data={[
            { name: 'Jan', value: 75 },
            { name: 'Feb', value: 105 },
            { name: 'Mar', value: 95 },
            { name: 'Apr', value: 120 },
            { name: 'May', value: 135 },
            { name: 'Jun', value: 150 },
          ]}>
            <ChartTooltip 
              content={<ChartTooltipContent />}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
