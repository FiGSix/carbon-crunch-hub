
import { ReactNode } from "react";
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { cn } from "@/lib/utils";
import { Footer } from "./footer";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth"; // Updated import path
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
  requiredRole?: 'client' | 'agent' | 'admin';
}

export function DashboardLayout({ 
  children, 
  requiredRole 
}: DashboardLayoutProps) {
  const { userRole, isLoading, isAdmin } = useAuth(); // Using modern context

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-crunch-yellow" />
      </div>
    );
  }

  // Redirect if user doesn't have the required role
  if (requiredRole) {
    // Admin can access any page regardless of required role
    if (!isAdmin && userRole !== requiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <DashboardSidebar userRole={userRole || 'client'} />
        </Sidebar>
        
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white to-gray-50">
          <motion.header 
            className="h-16 border-b border-crunch-black/5 flex items-center px-4 backdrop-blur-xl bg-white/80 shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SidebarTrigger className="hover:bg-crunch-yellow/10 rounded-full p-2 transition-colors duration-200" />
            <div className="ml-4 text-lg font-bold uppercase tracking-wide bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              {userRole === 'client' && 'CLIENT DASHBOARD'}
              {userRole === 'agent' && 'AGENT DASHBOARD'}
              {userRole === 'admin' && 'ADMIN DASHBOARD'}
            </div>
            <div className="ml-auto flex items-center gap-4">
              <NotificationBell />
              <div className="h-8 w-8 rounded-full bg-crunch-yellow/10 flex items-center justify-center">
                <span className="text-sm font-medium text-crunch-black">
                  {userRole && userRole.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </motion.header>
          
          <motion.main 
            className={cn("flex-1 p-4 md:p-6 lg:p-8")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {children}
          </motion.main>
          
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
