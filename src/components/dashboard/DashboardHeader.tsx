
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  userName?: string;
  userRole?: string;
}

export function DashboardHeader({ 
  title, 
  description, 
  actions,
  userName,
  userRole
}: DashboardHeaderProps) {
  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">{title}</h1>
          {userRole && userName && (
            <div className="text-sm text-crunch-black/50 mt-1">
              Logged in as <span className="font-semibold text-crunch-black/80">{userName}</span> <span className="px-1.5 py-0.5 bg-crunch-yellow/20 text-crunch-black/70 rounded-full text-xs font-medium">{userRole}</span>
            </div>
          )}
        </div>
        {actions}
      </div>
      {description && (
        <p className="text-lg text-crunch-black/60 mt-2 font-light">{description}</p>
      )}
    </motion.div>
  );
}
