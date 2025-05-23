
import React from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';

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
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={onInputChange}
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={onInputChange}
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
            value={email}
            onChange={onInputChange}
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
            value={phone}
            onChange={onInputChange}
            disabled={isLoading}
            placeholder="Optional"
          />
        </div>
      </CardContent>
    </Card>
  );
}
