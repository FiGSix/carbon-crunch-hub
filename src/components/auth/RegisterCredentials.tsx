
import { FormField } from "@/components/common/FormField";
import { FormLoadingOverlay } from "@/components/ui/enterprise-loading";

interface RegisterCredentialsProps {
  email: string;
  password: string;
  confirmPassword: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export function RegisterCredentials({ 
  email, 
  password, 
  confirmPassword, 
  onChange, 
  disabled 
}: RegisterCredentialsProps) {
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return "weak";
    if (pwd.length < 10) return "medium";
    return "strong";
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <FormLoadingOverlay isLoading={disabled} message="Validating credentials...">
      <div className="space-y-6" role="group" aria-labelledby="credentials-heading">
      <div id="credentials-heading" className="sr-only">
        Account credentials section
      </div>
      
      <FormField
        id="email"
        name="email"
        label="Email Address"
        type="email"
        value={email}
        onChange={onChange}
        placeholder="you@example.com"
        required
        disabled={disabled}
        description="We'll use this email to send you important account information"
        className="retro-input"
      />
      
      <div className="space-y-3">
        <FormField
          id="password"
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={onChange}
          required
          disabled={disabled}
          description="Choose a strong password with at least 8 characters"
          className="retro-input"
        />
        
        {password && (
          <div 
            className="text-sm"
            role="status"
            aria-live="polite"
            aria-label={`Password strength: ${passwordStrength}`}
          >
            <div className="flex items-center gap-2">
              <span>Password strength:</span>
              <div className="flex gap-1">
                <div className={`h-2 w-6 rounded ${passwordStrength === 'weak' ? 'bg-destructive' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <div className={`h-2 w-6 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-muted'}`} />
                <div className={`h-2 w-6 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-muted'}`} />
              </div>
              <span className="capitalize">{passwordStrength}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <FormField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={onChange}
          required
          disabled={disabled}
          description="Re-enter your password to confirm"
          error={confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined}
          className="retro-input"
        />
        
        {confirmPassword && passwordsMatch && (
          <div 
            className="flex items-center gap-2 text-sm text-green-600"
            role="status"
            aria-live="polite"
          >
            <span className="flex-shrink-0" aria-hidden="true">✓</span>
            <span>Passwords match</span>
          </div>
        )}
      </div>
    </div>
    </FormLoadingOverlay>
  );
}
