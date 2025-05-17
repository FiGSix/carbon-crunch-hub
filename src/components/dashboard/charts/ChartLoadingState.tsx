
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartLoadingStateProps {
  title?: string;
}

export const ChartLoadingState: React.FC<ChartLoadingStateProps> = ({ 
  title = "Deal Status" 
}) => {
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
              {title}
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
};
