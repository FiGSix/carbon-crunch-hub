
import { SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, FileText, BarChart, Users, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardSidebarProps {
  userRole: 'client' | 'agent' | 'admin';
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const navigate = useNavigate();

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
              onClick={() => navigate("/")}
              className="w-full flex gap-2 items-center py-2 px-3 text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>
      </SidebarMenu>
    </SidebarContent>
  );
}
