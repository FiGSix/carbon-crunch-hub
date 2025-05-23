
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Profile = () => {
  const { profile, userRole, refreshUser } = useAuth();
  const isAgent = userRole === 'agent';

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-carbon-gray-900">Profile Settings</h1>
            <p className="text-carbon-gray-600 mt-2">
              Manage your account information and preferences
            </p>
          </div>

          <ProfileForm
            profile={profile}
            refreshUser={refreshUser}
            isAgent={isAgent}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
