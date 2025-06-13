
import React from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { FormField } from '@/components/common/FormField';

interface PersonalInformationCardProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarChange: (avatarUrl: string | null) => void;
  isLoading: boolean;
}

export function PersonalInformationCard({
  firstName,
  lastName,
  email,
  phone,
  avatarUrl,
  onInputChange,
  onAvatarChange,
  isLoading
}: PersonalInformationCardProps) {
  return (
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
        <div>
          <Label>Profile Picture</Label>
          <div className="mt-2">
            <ProfilePictureUpload
              currentAvatarUrl={avatarUrl}
              onAvatarUpdate={onAvatarChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="firstName"
            name="firstName"
            label="First Name"
            value={firstName}
            onChange={onInputChange}
            disabled={isLoading}
            required
          />
          <FormField
            id="lastName"
            name="lastName"
            label="Last Name"
            value={lastName}
            onChange={onInputChange}
            disabled={isLoading}
            required
          />
        </div>
        
        <FormField
          id="email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={onInputChange}
          disabled={isLoading}
          required
        />
        
        <FormField
          id="phone"
          name="phone"
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={onInputChange}
          disabled={isLoading}
          placeholder="Optional"
        />
      </CardContent>
    </Card>
  );
}
