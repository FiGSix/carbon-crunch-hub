
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Enhanced data with more vibrant colors matching the 3D pie chart design
const data = [
  { name: 'Draft', value: 4, color: '#9ca3af', shadowColor: '#7c7f86' },
  { name: 'Pending', value: 6, color: '#22c55e', shadowColor: '#15803d' },
  { name: 'Signed', value: 8, color: '#3b82f6', shadowColor: '#1d4ed8' },
  { name: 'Declined', value: 2, color: '#ef4444', shadowColor: '#b91c1c' },
];

const RADIAN = Math.PI / 180;

// Custom label component with connecting lines
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
  const radius = outerRadius * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Calculate line points
  const mx = cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN);
  const my = cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN);

  // Direction based on which side of the chart
  const textAnchor = x > cx ? 'start' : 'end';
  
  // Text direction and offset
  const textX = x > cx ? x + 5 : x - 5;
  
  return (
    <g>
      {/* Line from pie to label */}
      <path 
        d={`M${cx},${cy} L${mx},${my} L${x},${y}`} 
        stroke={data[index].color} 
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      
      {/* Dot at pie end */}
      <circle cx={mx} cy={my} r={2} fill={data[index].color} />
      
      {/* Percentage */}
      <text 
        x={textX} 
        y={y} 
        fill={data[index].color}
        textAnchor={textAnchor} 
        dominantBaseline="middle"
        fontWeight="bold"
        fontSize={16}
      >
        {`${(Number(percent) * 100).toFixed(0)}%`}
      </text>
      
      {/* Label */}
      <text 
        x={textX} 
        y={y + 20} 
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

export function DealStatusChart() {
  // Calculate total value for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="h-full"
    >
      <Card className="border border-crunch-black/5 bg-white h-full flex flex-col relative overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Deal Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 flex-1 flex items-center justify-center min-h-[320px] overflow-visible">
          {/* Platform/Base effect */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-[180px] h-[20px] bg-gray-200 rounded-full shadow-md opacity-50"></div>
          
          {/* 3D Perspective wrapper */}
          <div className="relative w-full h-full flex items-center justify-center transform-gpu perspective-[1200px]">
            <div className="transform-gpu rotate-x-[30deg] rotate-z-[0deg]">
              <ResponsiveContainer width={320} height={320}>
                <PieChart>
                  {/* Shadow effect for 3D */}
                  <defs>
                    {data.map((entry, index) => (
                      <filter
                        key={`shadow-${index}`}
                        id={`shadow-${index}`}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                      >
                        <feOffset dx="0" dy="10" />
                        <feGaussianBlur stdDeviation="10" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
                        />
                      </filter>
                    ))}
                  </defs>
                  
                  {/* Main pie */}
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    innerRadius={0}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1000}
                    isAnimationActive={true}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="white"
                        strokeWidth={2}
                        filter={`url(#shadow-${index})`}
                      />
                    ))}
                  </Pie>
                  
                  {/* Shadow/Bottom effect for 3D illusion */}
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={0}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={0}
                    startAngle={90}
                    endAngle={-270}
                    style={{
                      transform: 'translateY(15px) scaleY(0.15)',
                      opacity: 0.3,
                      mixBlendMode: 'multiply'
                    }}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`shadow-cell-${index}`} 
                        fill={entry.shadowColor} 
                      />
                    ))}
                  </Pie>
                  
                  <Tooltip 
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
