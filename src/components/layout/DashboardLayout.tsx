
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
import { useAuth } from "@/contexts/auth"; 
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, User } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
  requiredRole?: 'client' | 'agent' | 'admin';
}

export function DashboardLayout({ 
  children, 
  requiredRole 
}: DashboardLayoutProps) {
  const { userRole, isLoading, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      <div className="min-h-screen flex w-full bg-gray-50">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <motion.header 
            className={cn(
              "h-14 md:h-16 border-b border-gray-200 flex items-center px-3 md:px-4 bg-white shadow-sm",
              "sticky top-0 z-30"
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SidebarTrigger className="hover:bg-crunch-yellow/10 rounded-lg p-2 transition-colors duration-200 touch-manipulation" />
            <div className={cn(
              "ml-2 md:ml-4 font-bold uppercase tracking-wide text-crunch-black",
              isMobile ? "text-sm" : "text-lg"
            )}>
              {userRole === 'client' && (isMobile ? 'CLIENT' : 'CLIENT DASHBOARD')}
              {userRole === 'agent' && (isMobile ? 'AGENT' : 'AGENT DASHBOARD')}
              {userRole === 'admin' && (isMobile ? 'ADMIN' : 'ADMIN DASHBOARD')}
            </div>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <NotificationBell />
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full p-0 h-8 w-8 md:h-9 md:w-9 flex items-center justify-center hover:bg-crunch-yellow/10 touch-manipulation"
                onClick={() => navigate('/profile')}
              >
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-crunch-yellow/20 text-crunch-black font-medium text-xs md:text-sm">
                    {profile?.first_name?.[0]?.toUpperCase() || profile?.role?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </motion.header>
          
          <motion.main 
            className={cn(
              "flex-1 bg-gray-50 overflow-x-hidden",
              isMobile ? "p-3" : "p-4 md:p-6 lg:p-8"
            )}
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
