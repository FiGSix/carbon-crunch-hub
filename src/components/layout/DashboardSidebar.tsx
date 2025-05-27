
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  UserPlus, 
  Settings, 
  Bell,
  Users,
  Calculator,
  LogOut,
  Loader2,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { signOut } from '@/lib/supabase/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useState } from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles?: string[];
  isSignOut?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Proposals', href: '/proposals', icon: FileText },
  { name: 'My Clients', href: '/clients', icon: Users, roles: ['agent', 'admin'] },
  { name: 'Calculator', href: '/calculator', icon: Calculator, roles: ['client', 'admin'] },
  { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['client', 'admin'] },
  { name: 'Profile', href: '/profile', icon: Settings },
  { name: 'Sign out', href: '#', icon: LogOut, isSignOut: true },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Add admin navigation for admin users
  const adminNavigation: NavigationItem[] = userRole === 'admin' ? [
    { 
      name: 'Admin', 
      href: '/admin', 
      icon: Shield
    }
  ] : [];

  const allNavigation = [...navigation.slice(0, -1), ...adminNavigation, navigation[navigation.length - 1]];

  const filteredNavigation = allNavigation.filter(item => 
    !item.roles || item.roles.includes(userRole || '')
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const success = await signOut();
      if (success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link to="/" className="text-xl font-semibold text-crunch-black hover:text-crunch-yellow transition-colors">
            CrunchCarbon
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-4 py-4 space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const isSignOutItem = item.isSignOut;
                
                if (isSignOutItem) {
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className={cn(
                            'group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all duration-200 w-full',
                            'text-gray-700 hover:text-red-600 hover:bg-red-50',
                            isLoggingOut && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isLoggingOut ? (
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                          ) : (
                            <item.icon className="h-5 w-5 shrink-0 transition-colors text-gray-500 group-hover:text-red-600" />
                          )}
                          <span className="truncate">{isLoggingOut ? 'Signing out...' : item.name}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all duration-200 w-full',
                          isActive
                            ? 'bg-crunch-yellow text-crunch-black shadow-sm'
                            : 'text-gray-700 hover:text-crunch-black hover:bg-crunch-yellow/10'
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive ? "text-crunch-black" : "text-gray-500 group-hover:text-crunch-black"
                        )} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </div>
  );
}
