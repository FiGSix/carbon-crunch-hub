
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

const UserManagement = () => {
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
        title="User Management" 
        description="Manage users and their roles across the platform" 
      />
      <div className="space-y-6">
        <UserManagementTable />
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
