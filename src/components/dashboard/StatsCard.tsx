
import { ReactNode } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <Card className="retro-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-carbon-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{value}</div>
          <div className="rounded-full bg-carbon-green-100 p-2">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
