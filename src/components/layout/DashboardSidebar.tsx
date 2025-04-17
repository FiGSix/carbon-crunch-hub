
import { SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, FileText, BarChart, Users, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";

interface DashboardSidebarProps {
  userRole: 'client' | 'agent' | 'admin';
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
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
      console.log("Logout initiated");
      
      // Clear local auth state first
      const { setUser, setUserRole, setProfile, setSession } = useAuth();
      if (setUser && setUserRole && setProfile && setSession) {
        setUser(null);
        setUserRole(null);
        setProfile(null);
        setSession(null);
      }
      
      // Call sign out and wait for it to complete
      const { error } = await signOut();
      
      if (error) {
        console.error("Error during logout:", error);
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
      
      // Clear local storage items manually as a fallback
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear session storage
      sessionStorage.clear();
      
      // Navigate to login page immediately after successful logout
      console.log("Navigating to login page");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Exception in handleLogout:", error);
      toast({
        title: "Error",
        description: "There was a problem logging out. Try using Force Logout.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SidebarContent className="pt-4">
      <div className="px-3 mb-8">
        <div className="flex items-center justify-center">
          <img src="/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png" alt="CrunchCarbon Logo" className="h-12" />
        </div>
      </div>
      
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              onClick={() => navigate(item.path)}
              className="w-full flex gap-2 items-center py-2 px-3 hover:bg-crunch-yellow/10 hover:text-crunch-black"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        
        <div className="mt-8 px-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex gap-2 items-center py-2 px-3 text-destructive"
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
