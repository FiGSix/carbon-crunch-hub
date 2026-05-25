import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserPlus, 
  Bell,
  Settings,
  LogOut,
  User,
  UserCog,
  FileSignature,
  ClipboardCheck,
  Shield,
  UserCheck,
  Database,
  Mail,
  Scale,
  Calculator,
  Code2,
  BookOpen,
  ShieldOff
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function DashboardSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Team",
      href: "/team",
      icon: UserCheck,
      roles: ["admin", "agent"]
    },
    {
      name: "Quick Calc",
      href: "/quick-calc",
      icon: Calculator,
      roles: ["admin", "agent"]
    },
    {
      name: "Knowledge Hub",
      href: "/knowledge-hub",
      icon: BookOpen,
      roles: ["admin", "agent"]
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
      name: "Project Onboarding",
      href: "/onboarding",
      icon: ClipboardCheck,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Submit a Project",
      href: "/submit-project",
      icon: FileText,
      roles: ["client"]
    },
    {
      name: "Audit Status",
      href: "/admin/audit-status",
      icon: ClipboardCheck,
      roles: ["admin"]
    },
    {
      name: "My Clients",
      href: "/my-clients",
      icon: Users,
      roles: ["admin", "agent"]
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      roles: ["admin", "agent", "client"]
    },
    {
      name: "Team",
      href: "/client-team",
      icon: UserCheck,
      roles: ["client"]
    },
    {
      name: "Refer a Friend",
      href: "/referral",
      icon: UserPlus,
      roles: ["client"]
    },
    {
      name: "Agent Management",
      href: "/admin/agents",
      icon: UserCog,
      roles: ["admin"]
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: Shield,
      roles: ["admin"]
    },
    {
      name: "Digital Signatures",
      href: "/admin/signatures",
      icon: FileSignature,
      roles: ["admin"]
    },
    {
      name: "Email Automation",
      href: "/admin/email-automation",
      icon: Mail,
      roles: ["admin"]
    },
    {
      name: "Blocked Emails",
      href: "/admin/blocked-emails",
      icon: ShieldOff,
      roles: ["admin"]
    },
    {
      name: "Legal Documents",
      href: "/admin/legal-documents",
      icon: Scale,
      roles: ["admin"]
    },
    {
      name: "Partner API",
      href: "/admin/partners",
      icon: Code2,
      roles: ["admin"]
    },
    {
      name: "Knowledge Hub Mgmt",
      href: "/admin/knowledge-hub",
      icon: BookOpen,
      roles: ["admin"]
    },
    {
      name: "System Settings",
      href: "/system-settings",
      icon: Settings,
      roles: ["admin"]
    },
    {
      name: "System Diagnostics",
      href: "/system-diagnostics",
      icon: Settings,
      roles: ["admin"]
    },
    {
      name: "Data Diagnostics",
      href: "/admin/data-diagnostics",
      icon: Database,
      roles: ["admin"]
    }
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 ${
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                          : "text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <Link to={item.href} className="flex items-center w-full">
                        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Separator */}
              <li className="my-2">
                <hr className="border-gray-200" />
              </li>
              
              {/* Sign Out Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
