
import React from "react";

interface DashboardHeaderProps {
  title: string;
  description: string;
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-carbon-gray-900">{title}</h1>
      <p className="text-carbon-gray-600">{description}</p>
    </div>
  );
}
