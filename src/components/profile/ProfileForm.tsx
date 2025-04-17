
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { Loader2, Camera, User } from "lucide-react";

// Form validation schema
const profileFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company_name: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { profile, user } = useAuth();
  const { updateUserProfile, isSubmitting } = useProfileUpdate();
  const { avatarUrl, uploadAvatar, fetchAvatarUrl, isUploading } = useAvatarUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Initialize form with user profile data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      email: profile?.email || "",
      company_name: profile?.company_name || "",
      phone: profile?.phone || "",
    },
  });
  
  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        company_name: profile.company_name || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, form]);
  
  // Fetch avatar URL when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchAvatarUrl(user.id);
    }
  }, [user?.id]);

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Preview the selected image
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('avatar-preview')?.setAttribute('src', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    console.log("Submitting profile data:", data);
    
    // First upload avatar if one was selected
    if (avatarFile) {
      await uploadAvatar(avatarFile);
    }
    
    // Then update profile data
    const result = await updateUserProfile(data);
    
    if (result.success) {
      // Reset avatar file state
      setAvatarFile(null);
    }
  };
  
  // Generate avatar initials from user name
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    } else if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile?.company_name) {
      return profile.company_name[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and profile picture
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-8 mb-8 items-center">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-muted">
              <AvatarImage id="avatar-preview" src={avatarUrl || ""} />
              <AvatarFallback className="text-2xl bg-crunch-yellow/20 text-crunch-black">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <label 
              htmlFor="avatar-upload" 
              className="absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground p-1.5 cursor-pointer shadow-sm hover:bg-primary/90 transition-colors group-hover:opacity-100"
            >
              <Camera className="h-4 w-4" />
              <span className="sr-only">Upload new avatar</span>
            </label>
            
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
              disabled={isUploading}
            />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold">
              {profile?.first_name} {profile?.last_name}
            </h3>
            <p className="text-muted-foreground">{profile?.email}</p>
            <p className="text-sm text-muted-foreground capitalize mt-1">
              {profile?.role} Account
            </p>
            {avatarFile && (
              <p className="text-sm text-green-600 mt-2">
                New profile picture selected
              </p>
            )}
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your email address" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the email address associated with your account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your company name (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Your phone number (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || isUploading || !form.formState.isDirty && !avatarFile}
              >
                {(isSubmitting || isUploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
