
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { RoleValidationService } from "@/services/auth/RoleValidationService";
import { authLogger } from "@/lib/logger";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  companyLogoUrl: string;
  role: "client" | "agent";
}

export function useRegisterForm(initialRole: "client" | "agent") {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyLogoUrl: "",
    role: initialRole,
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    authLogger.info("Role changed during registration", { newRole: value });
    setFormData((prev) => ({ ...prev, role: value as "client" | "agent" }));
  };

  const handleCompanyLogoChange = (logoUrl: string | null) => {
    setFormData((prev) => ({ ...prev, companyLogoUrl: logoUrl || "" }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.role === "agent" && !termsAccepted) {
      toast({
        title: "Terms & Conditions Required",
        description: "You must accept the Agent Referral Agreement to continue",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      authLogger.info("Starting registration process", { 
        email: formData.email, 
        role: formData.role 
      });
      
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.role as 'client' | 'agent' | 'admin',
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company_name: formData.companyName || null,
          company_logo_url: formData.companyLogoUrl || null,
          terms_accepted: formData.role === 'agent' ? termsAccepted : null,
          terms_accepted_at: formData.role === 'agent' && termsAccepted ? new Date().toISOString() : null,
        }
      );
      
      if (error) {
        throw error;
      }
      
      // Validate role assignment after successful signup
      if (data?.user?.id) {
        authLogger.info("Post-registration role validation starting", { 
          userId: data.user.id,
          expectedRole: formData.role 
        });
        
        // Give the database trigger time to create the profile
        setTimeout(async () => {
          try {
            const validation = await RoleValidationService.validateUserRole(data.user.id);
            
            if (!validation.isValid || validation.mismatchDetected) {
              authLogger.warn("Role validation issue detected after registration", { 
                userId: data.user.id,
                validation 
              });
              
              // Attempt to correct the role
              const correction = await RoleValidationService.correctUserRole(data.user.id);
              
              if (correction.success) {
                authLogger.info("Post-registration role corrected", { 
                  userId: data.user.id,
                  correctedRole: correction.correctedRole 
                });
              } else {
                authLogger.error("Post-registration role correction failed", { 
                  userId: data.user.id,
                  error: correction.error 
                });
              }
            } else {
              authLogger.info("Post-registration role validation successful", { 
                userId: data.user.id,
                detectedRole: validation.detectedRole 
              });
            }
          } catch (validationError) {
            authLogger.error("Post-registration role validation failed", { 
              userId: data.user.id,
              error: validationError 
            });
          }
        }, 2000); // Wait 2 seconds for database trigger to complete
      }
      
      authLogger.info("Registration completed successfully", { 
        email: formData.email,
        role: formData.role 
      });
      
      toast({
        title: "Registration successful!",
        description: `Your ${formData.role} account has been created. Please check your email to verify your account.`,
      });
      
      // Redirect to verification page with email parameter
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      
    } catch (error: any) {
      authLogger.error("Registration failed", { 
        email: formData.email,
        role: formData.role,
        error: error.message 
      });
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setTermsDialogOpen(false);
  };

  return {
    formData,
    termsAccepted,
    termsDialogOpen,
    privacyDialogOpen,
    isLoading,
    setTermsAccepted,
    setTermsDialogOpen,
    setPrivacyDialogOpen,
    handleChange,
    handleRoleChange,
    handleCompanyLogoChange,
    handleSubmit,
    handleTermsAccept
  };
}
