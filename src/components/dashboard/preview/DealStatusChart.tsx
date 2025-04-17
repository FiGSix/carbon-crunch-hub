
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Enhanced data with the requested brand colors
const data = [
  { name: 'Draft', value: 4, color: '#8C8789', shadowColor: '#6A6566' },    // Light gray
  { name: 'Pending', value: 6, color: '#FFE580', shadowColor: '#E6CC73' },  // Lighter yellow (50% lighter)
  { name: 'Signed', value: 8, color: '#FFCD03', shadowColor: '#E6B800' },   // Primary yellow (brand yellow)
  { name: 'Declined', value: 2, color: '#231F20', shadowColor: '#0F0D0E' }, // Dark gray (brand black)
];

const RADIAN = Math.PI / 180;

// Custom label component with connecting lines
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
  const radius = outerRadius * 1.5; // Slightly farther from the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Calculate line points with a slight curve
  const mx = cx + (outerRadius + 15) * Math.cos(-midAngle * RADIAN);
  const my = cy + (outerRadius + 15) * Math.sin(-midAngle * RADIAN);

  // Direction based on which side of the chart
  const textAnchor = x > cx ? 'start' : 'end';
  
  // Text direction and offset
  const textX = x > cx ? x + 5 : x - 5;
  
  return (
    <g>
      {/* Line from pie to label with soft curve */}
      <path 
        d={`M${cx},${cy} Q${mx+10},${my-5} ${x},${y}`} 
        stroke={data[index].color} 
        fill="none"
        strokeWidth={1.5}
        opacity={0.8}
      />
      
      {/* Small dot at the end of line */}
      <circle cx={x} cy={y} r={3} fill={data[index].color} />
      
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
          {/* Enhanced platform/base effect with stronger, more realistic shadow */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-[220px] h-[25px] bg-gray-200/50 rounded-[50%] shadow-2xl blur-md opacity-30"></div>
          
          {/* 3D Perspective wrapper with improved perspective and subtle tilt */}
          <div className="relative w-full h-full flex items-center justify-center transform-gpu perspective-[1000px]">
            {/* Light source effect */}
            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-white/30 to-transparent opacity-30 pointer-events-none"></div>
            
            {/* 3D transformed pie chart container */}
            <div className="transform-gpu" style={{ transform: 'rotateX(25deg) rotateZ(-10deg)' }}>
              <ResponsiveContainer width={400} height={400}>
                <PieChart>
                  {/* Enhanced shadow effects for 3D appearance */}
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
                        {/* Main drop shadow for depth */}
                        <feOffset dx="0" dy="20" />
                        <feGaussianBlur stdDeviation="15" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                        />
                        {/* Subtle inner shadow for matt finish */}
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.8" />
                        </feComponentTransfer>
                      </filter>
                      
                    ))}
                    
                    {/* Subtle gradient for top lighting effect */}
                    <linearGradient id="topLighting" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Main pie with larger size and better shadow effect */}
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={110}
                    innerRadius={0}
                    paddingAngle={3} // Tighter segments for a cleaner look
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
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
                  
                  {/* Shadow/Bottom effect for 3D illusion with improved positioning */}
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={0}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={0}
                    startAngle={90}
                    endAngle={-270}
                    style={{
                      transform: 'translateY(30px) scaleY(0.12)',
                      opacity: 0.25,
                      mixBlendMode: 'multiply',
                      filter: 'blur(2px)'
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
