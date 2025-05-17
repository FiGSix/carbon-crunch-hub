
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartEmptyStateProps {
  title?: string;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ 
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
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <p>No proposals available</p>
            <p className="text-sm">Proposals will appear here when created</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
