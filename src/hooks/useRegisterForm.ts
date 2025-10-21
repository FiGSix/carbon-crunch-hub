
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { RoleValidationService } from "@/services/auth/RoleValidationService";
import { authLogger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

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

export function useRegisterForm(initialRole: "client" | "agent", invitationToken?: string) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitationLoading, setInvitationLoading] = useState(!!invitationToken);
  const [invitationData, setInvitationData] = useState<any>(null);
  
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

  // Fetch and validate invitation token
  useEffect(() => {
    if (!invitationToken) return;

    const validateInvitation = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_invitations')
          .select('*')
          .eq('invitation_token', invitationToken)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          toast({
            title: "Invalid Invitation",
            description: "This invitation link is invalid or has expired.",
            variant: "destructive",
          });
          navigate('/register');
          return;
        }

        // Check if invitation has expired
        if (new Date(data.expires_at) < new Date()) {
          toast({
            title: "Invitation Expired",
            description: "This invitation link has expired. Please request a new invitation.",
            variant: "destructive",
          });
          navigate('/register');
          return;
        }

        // Pre-fill form with invitation data
        setInvitationData(data);
        setFormData((prev) => ({
          ...prev,
          email: data.email,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          companyName: data.company_name || "",
          role: "agent", // Lock role to agent
        }));

        authLogger.info("Invitation validated and form pre-filled", { 
          email: data.email,
          invitationId: data.id 
        });

      } catch (error) {
        console.error("Error validating invitation:", error);
        toast({
          title: "Error",
          description: "Failed to validate invitation. Please try again.",
          variant: "destructive",
        });
      } finally {
        setInvitationLoading(false);
      }
    };

    validateInvitation();
  }, [invitationToken, navigate, toast]);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    // Prevent role change if invitation token exists
    if (invitationToken) {
      toast({
        title: "Role Locked",
        description: "You must register as an agent to accept this invitation.",
        variant: "destructive",
      });
      return;
    }
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

      // Mark invitation as accepted if token exists
      if (invitationToken && invitationData) {
        try {
          await supabase
            .from('agent_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
            })
            .eq('id', invitationData.id);

          authLogger.info("Invitation marked as accepted", { 
            invitationId: invitationData.id 
          });
        } catch (error) {
          authLogger.error("Failed to mark invitation as accepted", { 
            error,
            invitationId: invitationData.id 
          });
        }
      }
      
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
    isLoading: isLoading || invitationLoading,
    setTermsAccepted,
    setTermsDialogOpen,
    setPrivacyDialogOpen,
    handleChange,
    handleRoleChange,
    handleCompanyLogoChange,
    handleSubmit,
    handleTermsAccept,
    isInvitationRegistration: !!invitationToken,
  };
}
