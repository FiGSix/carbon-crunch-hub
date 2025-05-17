
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ProposalListItem } from "@/types/proposals";
import { Skeleton } from "@/components/ui/skeleton";

// Define brand colors for different statuses
const STATUS_COLORS = {
  'draft': '#8C8789',     // Light gray
  'pending': '#FFE580',   // Lighter yellow
  'signed': '#FFCD03',    // Primary yellow (brand yellow)
  'declined': '#231F20',  // Dark gray (brand black)
  'approved': '#4CAF50',  // Success green
  'rejected': '#F44336',  // Error red
  'archived': '#607D8B',  // Blue gray
  'review': '#2196F3',    // Info blue
};

// Custom label component with connecting lines
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
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

interface DealStatusChartProps {
  proposals: ProposalListItem[];
  loading: boolean;
}

export function DealStatusChart({ proposals, loading }: DealStatusChartProps) {
  // Generate chart data from proposals
  const statusCounts = proposals.reduce((counts, proposal) => {
    const status = proposal.status || 'unknown';
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (!counts[formattedStatus]) {
      counts[formattedStatus] = 0;
    }
    counts[formattedStatus]++;
    
    return counts;
  }, {} as Record<string, number>);
  
  // Convert to array format for recharts
  const data = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name.toLowerCase()] || '#999'
  }));
  
  // Calculate total value for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  // If no data or loading, show appropriate UI
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="h-full"
      >
        <Card className="border border-crunch-black/5 bg-white h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
                Deal Status
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex-1 flex items-center justify-center">
            <div className="w-full h-[300px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  // If no proposals, show empty state
  if (proposals.length === 0 || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="h-full"
      >
        <Card className="border border-crunch-black/5 bg-white h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
                Deal Status
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex-1 flex items-center justify-center">
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <p>No proposals available</p>
              <p className="text-sm">Proposals will appear here when created</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="h-full"
    >
      <Card className="border border-crunch-black/5 bg-white h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Deal Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 flex-1 flex items-center justify-center">
          <div className="w-full h-full max-w-md mx-auto">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
