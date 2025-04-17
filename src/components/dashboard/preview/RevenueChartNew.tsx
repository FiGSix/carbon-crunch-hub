
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

// Sample data for the chart
const data = [
  { name: 'Jan', value: 15000 },
  { name: 'Feb', value: 22000 },
  { name: 'Mar', value: 19000 },
  { name: 'Apr', value: 25000 },
  { name: 'May', value: 28000 },
  { name: 'Jun', value: 32000 },
];

export function RevenueChartNew() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full"
    >
      <Card className="border border-crunch-black/5 bg-white h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Monthly Revenue
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 10,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFCD03" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FFCD03" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 12 }}
                tickFormatter={(value) => `R${value/1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  border: 'none',
                  padding: '8px 12px',
                }}
                formatter={(value: number) => [`R ${value.toLocaleString()}`, 'Revenue']}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#FFCD03" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)" 
                activeDot={{ r: 6, fill: "#FFCD03", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
