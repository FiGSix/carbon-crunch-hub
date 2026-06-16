

import { useAuth } from '@/contexts/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ClientReferralSection } from '@/components/profile/ClientReferralSection';
import { ReferralLinkWidget } from '@/components/referral/ReferralLinkWidget';
import { ReferralBioCard } from '@/components/referral/ReferralBioCard';
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Profile = () => {
  const { profile, userRole, refreshUser } = useAuth();
  const isAgent = userRole === 'agent';
  const isAdmin = userRole === 'admin';
  const isSuperPartner = userRole === 'super_partner';

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
            isSuperPartner={isSuperPartner}
          />

          {/* Referral system - for agents and super partners */}
          {isAgent && <ReferralLinkWidget linkType="client" />}

          {isSuperPartner && (
            <>
              <ReferralLinkWidget
                linkType="agent"
                title="Partner recruitment link"
                subtitle="Share this link — partners who sign up are linked to your network pending admin approval."
              />
              {profile?.can_create_proposals && (
                <ReferralLinkWidget
                  linkType="client"
                  title="Client referral link"
                  subtitle="Share this link — clients complete an assessment and receive a signable proposal instantly, attributed to you."
                />
              )}
            </>
          )}

          {(isAgent || isSuperPartner) && <ReferralBioCard />}

          {/* Client Referral Section - Only for agents and admins */}
          {(isAgent || isAdmin) && (
            <ClientReferralSection />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
