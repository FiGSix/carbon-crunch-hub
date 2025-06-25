
import { ReactNode } from "react";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { cn } from "@/lib/utils";
import { Footer } from "./footer";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth"; 
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
  const { userRole, isLoading, isInitialized, profile, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  console.log('🏠 DashboardLayout render:', { 
    userRole, 
    isLoading, 
    isInitialized, 
    hasProfile: !!profile,
    hasUser: !!user,
    requiredRole 
  });

  // Show loading state while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !userRole) {
    console.log('❌ User not authenticated in dashboard, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const isAdmin = userRole === 'admin';
    const hasRequiredRole = userRole === requiredRole;
    
    if (!isAdmin && !hasRequiredRole) {
      console.log('❌ Insufficient role for dashboard access, redirecting');
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <motion.header 
            className={cn(
              "h-14 md:h-16 border-b border-gray-200 flex items-center px-3 md:px-4 bg-white shadow-sm",
              "sticky top-0 z-30"
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SidebarTrigger className="hover:bg-blue-50 rounded-lg p-2 transition-colors duration-200 touch-manipulation" />
            <div className={cn(
              "ml-2 md:ml-4 font-bold uppercase tracking-wide text-gray-900",
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
                className="rounded-full p-0 h-8 w-8 md:h-9 md:w-9 flex items-center justify-center hover:bg-blue-50 touch-manipulation"
                onClick={() => navigate('/profile')}
              >
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-medium text-xs md:text-sm">
                    {profile?.first_name?.[0]?.toUpperCase() || userRole?.[0]?.toUpperCase() || '?'}
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
