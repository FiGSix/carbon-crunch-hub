
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CustomPieLabel } from "./CustomPieLabel";
import { STATUS_COLORS } from "./StatusColors";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartContentProps {
  data: ChartData[];
  total: number;
}

export const PieChartContent: React.FC<PieChartContentProps> = ({ 
  data, 
  total 
}) => {
  return (
    <div className="w-full h-full max-w-md mx-auto">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomPieLabel}
            outerRadius={100}
            innerRadius={0}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <ChartTooltip 
            formatter={(value) => [`${value} proposals (${(Number(value) / total * 100).toFixed(0)}%)`, 'Count']}
            contentStyle={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
              border: 'none' 
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
