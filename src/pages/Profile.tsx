
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useAuth } from "@/contexts/auth";

const Profile = () => {
  const { profile, userRole } = useAuth();
  
  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile?.first_name) {
      return profile.first_name;
    } else if (profile?.company_name) {
      return profile.company_name;
    }
    return 'User';
  };
  
  const formatUserRole = (role: string | null): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="My Profile" 
        description="View and update your profile information"
        userName={getUserDisplayName()}
        userRole={formatUserRole(userRole)}
      />
      <ProfileForm />
    </DashboardLayout>
  );
};

export default Profile;
