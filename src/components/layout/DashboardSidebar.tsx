
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
        <div className="flex items-center gap-2">
          <div className="bg-carbon-green-500 text-white font-bold p-2 rounded-md">CC</div>
          <span className="text-lg font-bold text-carbon-gray-900">CrunchCarbon</span>
        </div>
      </div>
      
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              onClick={() => navigate(item.path)}
              className="w-full flex gap-2 items-center py-2 px-3"
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
