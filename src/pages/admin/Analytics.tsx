
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

const Analytics = () => {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="System Analytics" 
        description="View comprehensive analytics and reports for the platform" 
      />
      <div className="space-y-6">
        <AnalyticsDashboard />
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
