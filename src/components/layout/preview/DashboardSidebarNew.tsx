
import { SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, FileText, BarChart, Users, Settings, LogOut, StepBack } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { motion } from "framer-motion";

interface DashboardSidebarNewProps {
  userRole: 'client' | 'agent' | 'admin';
}

export function DashboardSidebarNew({ userRole }: DashboardSidebarNewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { refreshUser } = useAuth();

  const clientMenuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "My Proposals", path: "/proposals" },
    { icon: BarChart, label: "Carbon Reports", path: "/reports" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const agentMenuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "Proposals", path: "/proposals" },
    { icon: Users, label: "My Clients", path: "/clients" },
    { icon: BarChart, label: "Commissions", path: "/commissions" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const adminMenuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "All Proposals", path: "/proposals" },
    { icon: Users, label: "User Management", path: "/users" },
    { icon: BarChart, label: "Reports", path: "/reports" },
    { icon: Settings, label: "System Settings", path: "/settings" },
  ];

  let menuItems;
  switch (userRole) {
    case 'agent':
      menuItems = agentMenuItems;
      break;
    case 'admin':
      menuItems = adminMenuItems;
      break;
    default:
      menuItems = clientMenuItems;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    try {
      setIsLoggingOut(true);
      
      // Call sign out and wait for it to complete
      const { error } = await signOut();
      
      if (error) {
        toast({
          title: "Error logging out",
          description: "There was a problem logging out. Try using Force Logout.",
          variant: "destructive",
        });
        return;
      }
      
      // Show success toast
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Navigate to login page immediately after successful logout
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem logging out. Try using Force Logout.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleExitPreview = () => {
    navigate("/dashboard");
  };

  return (
    <SidebarContent className="pt-4 bg-gradient-to-b from-crunch-black to-crunch-black/95 text-white">
      <div className="px-3 mb-8">
        <div className="flex items-center justify-center">
          <img src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" alt="CrunchCarbon Logo" className="h-12 drop-shadow-md" />
        </div>
      </div>
      
      <SidebarMenu>
        <SidebarMenuItem className="px-3 mb-2">
          <SidebarMenuButton
            onClick={handleExitPreview}
            className="w-full flex gap-2 items-center py-2 px-3 bg-crunch-yellow/20 text-crunch-yellow rounded-md hover:bg-crunch-yellow/30"
          >
            <StepBack className="h-5 w-5" />
            <span>Exit Preview</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <div className="px-3 py-2 text-xs uppercase text-crunch-yellow/50 tracking-wider">Navigation</div>

        {menuItems.map((item, index) => (
          <motion.div 
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                onClick={() => navigate(item.path)}
                className="w-full flex gap-2 items-center py-2 px-3 hover:bg-white/10 rounded-md transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </motion.div>
        ))}
        
        <div className="mt-8 px-3">
          <div className="py-2 text-xs uppercase text-crunch-yellow/50 tracking-wider">Account</div>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex gap-2 items-center py-2 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-md transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>
      </SidebarMenu>
    </SidebarContent>
  );
}
