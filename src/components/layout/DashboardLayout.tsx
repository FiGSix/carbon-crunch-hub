
import { ReactNode } from "react";
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { cn } from "@/lib/utils";
import { Footer } from "./Footer";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: 'client' | 'agent' | 'admin';
}

export function DashboardLayout({ 
  children, 
  userRole = 'client'
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <DashboardSidebar userRole={userRole} />
        </Sidebar>
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-crunch-black/5 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4 text-lg font-golden-age">
              {userRole === 'client' && 'CLIENT DASHBOARD'}
              {userRole === 'agent' && 'AGENT DASHBOARD'}
              {userRole === 'admin' && 'ADMIN DASHBOARD'}
            </div>
          </header>
          
          <main className={cn("flex-1 p-4 md:p-6")}>
            {children}
          </main>
          
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
