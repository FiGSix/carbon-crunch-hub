
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AdminMenu } from '@/components/admin/AdminMenu';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
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
        title="Admin Dashboard" 
        description="Manage system settings and perform administrative tasks" 
      />
      <div className="space-y-6">
        <AdminMenu />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
