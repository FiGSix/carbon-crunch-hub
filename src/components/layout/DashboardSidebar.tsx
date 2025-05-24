
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  UserPlus, 
  Settings, 
  Bell,
  Users,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Proposals', href: '/proposals', icon: FileText },
  { name: 'My Clients', href: '/clients', icon: Users, roles: ['agent', 'admin'] },
  { name: 'Calculator', href: '/calculator', icon: Calculator },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Profile', href: '/profile', icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { userRole } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(userRole || '')
  );

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link to="/" className="text-xl font-semibold text-carbon-primary">
          CrunchCarbon
        </Link>
      </div>
      <nav className="flex flex-1 flex-col px-6 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                    isActive
                      ? 'bg-carbon-primary text-white'
                      : 'text-carbon-gray-700 hover:text-carbon-primary hover:bg-carbon-gray-50'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
