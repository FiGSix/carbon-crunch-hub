
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserPlus, 
  Calculator,
  Bell,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/auth";

export function DashboardSidebar() {
  const location = useLocation();
  const { profile } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Proposals",
      href: "/proposals",
      icon: FileText,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Create Proposal",
      href: "/create-proposal",
      icon: FileText,
      roles: ["admin", "agent"]
    },
    {
      name: "My Clients",
      href: "/my-clients",
      icon: Users,
      roles: ["admin", "agent"]
    },
    {
      name: "Agents",
      href: "/agents",
      icon: UserPlus,
      roles: ["admin"]
    },
    {
      name: "Calculator",
      href: "/calculator",
      icon: Calculator,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "System Settings",
      href: "/system-settings",
      icon: Settings,
      roles: ["admin"]
    }
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-carbon-gray-200 h-full">
      <nav className="p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(item.href)
                  ? "bg-carbon-blue-50 text-carbon-blue-700"
                  : "text-carbon-gray-700 hover:bg-carbon-gray-50"
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
