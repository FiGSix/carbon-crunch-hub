
import React from "react";
import { STATUS_COLORS } from "./StatusColors";

type CustomLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
  name: string;
  value: number;
};

export const CustomPieLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
  value
}: CustomLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.3; // Position labels further from the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Calculate line points
  const mx = cx + outerRadius * Math.cos(-midAngle * RADIAN);
  const my = cy + outerRadius * Math.sin(-midAngle * RADIAN);

  // Text direction based on which side of the chart
  const textAnchor = x > cx ? 'start' : 'end';
  
  // Text direction and offset
  const textX = x > cx ? x + 5 : x - 5;
  
  // Only show labels for segments with enough percentage
  if (percent < 0.05) return null;
  
  return (
    <g>
      {/* Line from pie to label */}
      <path 
        d={`M${mx},${my} L${x},${y}`} 
        stroke={STATUS_COLORS[name.toLowerCase()] || '#999'} 
        fill="none"
        strokeWidth={1.5}
      />
      
      {/* Small dot at the end of line */}
      <circle cx={x} cy={y} r={3} fill={STATUS_COLORS[name.toLowerCase()] || '#999'} />
      
      {/* Percentage */}
      <text 
        x={textX} 
        y={y - 8} 
        fill={STATUS_COLORS[name.toLowerCase()] || '#999'}
        textAnchor={textAnchor} 
        dominantBaseline="middle"
        fontWeight="bold"
        fontSize={14}
      >
        {`${(Number(percent) * 100).toFixed(0)}%`}
      </text>
      
      {/* Label */}
      <text 
        x={textX} 
        y={y + 12} 
        fill="#666"
        textAnchor={textAnchor} 
        dominantBaseline="middle"
        fontSize={12}
      >
        {`${name}: ${value}`}
      </text>
    </g>
  );
};
