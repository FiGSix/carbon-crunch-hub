
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/lib/supabase/profile';
import { CompanyLogoUpload } from '@/components/profile/CompanyLogoUpload';
import { CompanyLogo } from '@/components/profile/CompanyLogo';
import { Building2, User } from 'lucide-react';

const Profile = () => {
  const { profile, userRole, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    companyName: profile?.company_name || '',
    companyLogoUrl: profile?.company_logo_url || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, companyLogoUrl: logoUrl || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        company_name: formData.companyName || null,
        company_logo_url: formData.companyLogoUrl || null,
      });

      if (error) throw error;

      await refreshUser();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray-900">Profile Settings</h1>
          <p className="text-carbon-gray-600 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Information - Only for Agents */}
          {userRole === 'agent' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Manage your company details and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Your company name"
                  />
                </div>
                
                <div>
                  <Label>Company Logo</Label>
                  <div className="mt-2">
                    <CompanyLogoUpload
                      currentLogoUrl={formData.companyLogoUrl}
                      onLogoUpdate={handleCompanyLogoChange}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Your company logo will appear on proposals and other documents
                  </p>
                </div>

                {formData.companyLogoUrl && (
                  <div>
                    <Label>Logo Preview</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <CompanyLogo 
                        logoUrl={formData.companyLogoUrl}
                        companyName={formData.companyName}
                        size="lg"
                      />
                      <div>
                        <p className="font-medium">{formData.companyName || 'Your Company'}</p>
                        <p className="text-sm text-gray-500">How it will appear on proposals</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
