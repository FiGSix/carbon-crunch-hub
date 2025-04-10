
import { useRegisterForm } from "@/hooks/useRegisterForm";
import { RegisterRoleSelect } from "./RegisterRoleSelect";
import { RegisterPersonalInfo } from "./RegisterPersonalInfo";
import { RegisterCredentials } from "./RegisterCredentials";
import { RegisterTerms } from "./RegisterTerms";
import { RegisterSubmitButton } from "./RegisterSubmitButton";

interface RegisterFormProps {
  initialRole: "client" | "agent";
}

export const RegisterForm = ({ initialRole }: RegisterFormProps) => {
  const {
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
    handleSubmit,
    handleTermsAccept
  } = useRegisterForm(initialRole);
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <RegisterRoleSelect 
          role={formData.role} 
          onRoleChange={handleRoleChange} 
          disabled={isLoading} 
        />
        
        <RegisterPersonalInfo 
          firstName={formData.firstName}
          lastName={formData.lastName}
          companyName={formData.companyName}
          showCompanyField={formData.role === "agent"}
          onChange={handleChange}
          disabled={isLoading}
        />
        
        <RegisterCredentials 
          email={formData.email}
          password={formData.password}
          confirmPassword={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading}
        />
        
        <RegisterTerms 
          showAgentTerms={formData.role === "agent"}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          termsDialogOpen={termsDialogOpen}
          setTermsDialogOpen={setTermsDialogOpen}
          privacyDialogOpen={privacyDialogOpen}
          setPrivacyDialogOpen={setPrivacyDialogOpen}
          onTermsAccept={handleTermsAccept}
          isLoading={isLoading}
        />
        
        <RegisterSubmitButton isLoading={isLoading} />
      </div>
    </form>
  );
};
