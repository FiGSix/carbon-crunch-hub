
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BulkPDFGenerator } from '@/components/admin/BulkPDFGenerator';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

const BulkPDFGeneration = () => {
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
        title="Bulk PDF Generation" 
        description="Generate PDFs for all proposals that are missing them" 
      />
      <div className="space-y-6">
        <BulkPDFGenerator />
      </div>
    </DashboardLayout>
  );
};

export default BulkPDFGeneration;
