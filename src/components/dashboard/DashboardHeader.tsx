
import { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {actions}
      </div>
      {description && (
        <p className="text-lg text-carbon-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}
