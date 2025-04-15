
import { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  userName?: string;
  userRole?: string;
}

export function DashboardHeader({ 
  title, 
  description, 
  actions,
  userName,
  userRole
}: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {userRole && userName && (
            <div className="text-sm text-carbon-gray-500 mt-1">
              Logged in as <span className="font-semibold">{userName}</span> ({userRole})
            </div>
          )}
        </div>
        {actions}
      </div>
      {description && (
        <p className="text-lg text-carbon-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}
